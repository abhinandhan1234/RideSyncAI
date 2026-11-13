import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { Driver, Ride, Offer, publicDocument } from '../models/booking.js';
import { bookingConfig } from '../config/booking.js';
import { ApiError, conflict, bookingInput } from './validation.js';
import { rankDrivers, haversineKm } from './ranking.js';

const notFound = resource => new ApiError(404, 'NOT_FOUND', `${resource} not found`);
const history = (reason, driverId, offerId) => ({ at: new Date(), reason, driverId, offerId });
const liveDriver = { driverId: { $type: 'string' } };
const eligible = { ...liveDriver, status: 'available', currentRideId: null, activeRideCount: 0 };

export class BookingService {
  constructor({ config = bookingConfig(), rank = rankDrivers } = {}) { this.config = config; this.rank = rank; }

  async transaction(fn) {
    const session = await mongoose.startSession();
    try { return await session.withTransaction(() => fn(session)); }
    finally { await session.endSession(); }
  }

  async details(rideId) {
    const ride = await Ride.findOne({ rideId }).lean();
    if (!ride) throw notFound('Ride');
    const offer = ride.activeOfferId ? await Offer.findOne({ offerId: ride.activeOfferId }).lean() : null;
    const driver = ride.assignedDriverId ? await Driver.findOne({ driverId: ride.assignedDriverId }).lean() : null;
    return { ...publicDocument(ride), offer: publicDocument(offer), driver: publicDocument(driver) };
  }

  async create(body) {
    const input = bookingInput(body);
    const ride = await Ride.create({ ...input, rideId: `R_${randomUUID()}`, status: 'searching',
      assignmentHistory: [history('requested'), history('searching')] });
    // Searching is durable. The worker retries dispatch if this process exits here.
    await this.dispatch(ride.rideId);
    return this.details(ride.rideId);
  }

  async dispatch(rideId) {
    const snapshot = await Ride.findOne({ rideId, status: 'searching' }).lean();
    if (!snapshot) return;
    const excluded = snapshot.assignmentHistory.map(h => h.driverId).filter(Boolean);
    const drivers = await Driver.find({ ...eligible, driverId: { $type: 'string', $nin: excluded },
      'vehicle.capacity': { $gte: snapshot.passengerCount } }).lean();
    const nearby = drivers.filter(d => haversineKm(d.location, snapshot.pickup) <= this.config.maxPickupKm);
    // Network calls must stay outside the retried transaction.
    const ranked = await this.rank(snapshot, nearby, this.config);
    await this.transaction(async session => {
      const ride = await Ride.findOne({ rideId, status: 'searching' }).session(session);
      if (!ride || ride.assignmentAttempts !== snapshot.assignmentAttempts) return;
      if (ride.assignmentAttempts < this.config.maxAttempts) {
        for (const candidate of ranked) {
          const driver = await Driver.findOneAndUpdate({ ...eligible, driverId: candidate.driverId,
            'vehicle.capacity': { $gte: ride.passengerCount } },
          { $set: { status: 'reserved', currentRideId: rideId } }, { new: true, session });
          if (!driver) continue;
          // Re-check location after ranking, since it can change during the AI call.
          if (haversineKm(driver.location, ride.pickup) > this.config.maxPickupKm) {
            await this.release(driver.driverId, rideId, session);
            continue;
          }
          const offerId = `O_${randomUUID()}`;
          await Offer.create([{ offerId, rideId, driverId: driver.driverId,
            attempt: ride.assignmentAttempts + 1, expiresAt: new Date(Date.now()+this.config.offerTimeoutMs),
            score: candidate.score, pickupEtaMinutes: candidate.pickupEtaMinutes, rankingSource: candidate.rankingSource }], { session });
          ride.status = 'offered'; ride.activeOfferId = offerId; ride.assignedDriverId = null;
          ride.assignmentAttempts++;
          ride.assignmentHistory.push(history('offered', driver.driverId, offerId));
          await ride.save({ session });
          return;
        }
      }
      ride.status = 'unassigned';
      ride.assignmentHistory.push(history(ride.assignmentAttempts >= this.config.maxAttempts ? 'max_attempts' : 'no_available_driver'));
      await ride.save({ session });
    });
  }

  async release(driverId, rideId, session, completed = false) {
    // Ownership filter prevents an old request from releasing a newer reservation.
    const driver = await Driver.findOne({ driverId, currentRideId: rideId }).session(session);
    if (!driver) return;
    if (driver.status !== 'offline') driver.status = 'available';
    driver.currentRideId = null; driver.activeRideCount = 0; driver.idleSince = new Date(); driver.idleMinutes = 0;
    if (completed) driver.completedRides++;
    await driver.save({ session });
  }

  async resetAssignment(ride, reason, session) {
    const offer = ride.activeOfferId ? await Offer.findOne({ offerId: ride.activeOfferId }).session(session) : null;
    const driverId = ride.assignedDriverId || offer?.driverId;
    if (offer?.status === 'pending') {
      offer.status = reason === 'rejected' ? 'rejected' : reason === 'expired' ? 'expired' : 'cancelled';
      offer.respondedAt = new Date(); await offer.save({ session });
    }
    if (driverId) await this.release(driverId, ride.rideId, session);
    ride.assignmentHistory.push(history(reason, driverId, ride.activeOfferId));
    ride.status = 'searching'; ride.activeOfferId = null; ride.assignedDriverId = null; ride.acceptedAt = undefined;
    ride.assignmentHistory.push(history('searching'));
    await ride.save({ session });
  }

  async respond(offerId, action, driverId) {
    const original = await Offer.findOne({ offerId }).lean();
    if (!original) throw notFound('Offer');
    if (driverId && original.driverId !== driverId) throw new ApiError(403, 'FORBIDDEN', 'Driver does not own offer');
    const result = await this.transaction(async session => {
      const offer = await Offer.findOne({ offerId }).session(session);
      if (offer.status !== 'pending') throw conflict('Offer already answered');
      const ride = await Ride.findOne({ rideId: offer.rideId }).session(session);
      if (!ride || ride.status !== 'offered' || ride.activeOfferId !== offerId) throw conflict('Ride no longer offered');
      if (offer.expiresAt <= new Date()) {
        await this.resetAssignment(ride, 'expired', session);
        return 'expired';
      }
      if (action === 'reject') { await this.resetAssignment(ride, 'rejected', session); return 'rejected'; }
      const driver = await Driver.findOneAndUpdate({ driverId: offer.driverId, status: 'reserved', currentRideId: ride.rideId },
        { $set: { status: 'busy', activeRideCount: 1 } }, { new: true, session });
      if (!driver) {
        await this.resetAssignment(ride, 'driver_unavailable', session);
        return 'unavailable';
      }
      offer.status = 'accepted'; offer.respondedAt = new Date(); await offer.save({ session });
      ride.status = 'accepted'; ride.assignedDriverId = driver.driverId; ride.acceptedAt = new Date();
      ride.assignmentHistory.push(history('accepted', driver.driverId, offerId));
      await ride.save({ session });
      return 'accepted';
    });
    if (result !== 'accepted') await this.dispatch(original.rideId);
    if (['expired','unavailable'].includes(result)) throw conflict(`Offer ${result}`);
    return this.details(original.rideId);
  }

  async transition(rideId, action, body = {}) {
    await this.transaction(async session => {
      const ride = await Ride.findOne({ rideId }).session(session);
      if (!ride) throw notFound('Ride');
      if (action === 'cancel' && body.actor === 'driver') {
        if (ride.status !== 'accepted' || ride.assignedDriverId !== body.driverId) throw conflict('Driver may cancel only their accepted ride before pickup');
        await this.resetAssignment(ride, 'driver_cancelled', session);
        return;
      }
      const allowed = { start: ['accepted'], complete: ['in_progress'], cancel: ['requested','searching','offered','accepted'] };
      if (!allowed[action]?.includes(ride.status)) throw conflict(`Cannot ${action} ride in ${ride.status}`);
      if (action === 'start') {
        const driver = await Driver.findOne({ driverId: ride.assignedDriverId, currentRideId: rideId, status: 'busy' }).session(session);
        if (!driver) throw conflict('Assigned driver unavailable');
        // Write the driver as well so simultaneous availability changes conflict.
        driver.activeRideCount = 1; driver.markModified('activeRideCount'); await driver.save({ session });
        ride.status = 'in_progress'; ride.startedAt = new Date();
      } else {
        const offer = ride.activeOfferId ? await Offer.findOne({ offerId: ride.activeOfferId }).session(session) : null;
        if (offer?.status === 'pending') { offer.status = 'cancelled'; offer.respondedAt = new Date(); await offer.save({ session }); }
        await this.release(ride.assignedDriverId || offer?.driverId, rideId, session, action === 'complete');
        ride.status = action === 'complete' ? 'completed' : 'cancelled';
        ride[action === 'complete' ? 'completedAt' : 'cancelledAt'] = new Date();
      }
      ride.assignmentHistory.push(history(ride.status, ride.assignedDriverId, ride.activeOfferId));
      await ride.save({ session });
    });
    if (action === 'cancel' && body.actor === 'driver') await this.dispatch(rideId);
    return this.details(rideId);
  }

  async availability(driverId, available) {
    const rideId = await this.transaction(async session => {
      const driver = await Driver.findOne({ driverId }).session(session);
      if (!driver) throw notFound('Driver');
      const ride = driver.currentRideId ? await Ride.findOne({ rideId: driver.currentRideId }).session(session) : null;
      if (ride?.status === 'in_progress') throw conflict('Cannot change availability during a trip');
      if (available && driver.currentRideId) throw conflict('Driver has an active reservation');
      driver.status = available ? 'available' : 'offline';
      if (available) driver.idleSince = new Date();
      await driver.save({ session });
      if (!available && ride && ['offered','accepted'].includes(ride.status)) {
        await this.resetAssignment(ride, 'driver_unavailable', session); return ride.rideId;
      }
      return null;
    });
    if (rideId) await this.dispatch(rideId);
    return { driver: publicDocument(await Driver.findOne({ driverId }).lean()) };
  }

  async tick() {
    const expired = await Offer.find({ status: 'pending', expiresAt: { $lte: new Date() } }).limit(100).lean();
    for (const item of expired) {
      await this.transaction(async session => {
        const offer = await Offer.findOne({ offerId: item.offerId, status: 'pending', expiresAt: { $lte: new Date() } }).session(session);
        if (!offer) return;
        const ride = await Ride.findOne({ rideId: offer.rideId, status: 'offered', activeOfferId: offer.offerId }).session(session);
        if (ride) await this.resetAssignment(ride, 'expired', session);
      });
    }
    // Also reconcile drivers set offline by an external operational process.
    const beforePickup = await Ride.find({ rideId: { $type: 'string' }, status: { $in: ['offered','accepted'] } }).limit(100).lean();
    for (const item of beforePickup) {
      await this.transaction(async session => {
        const ride = await Ride.findOne({ rideId: item.rideId, status: { $in: ['offered','accepted'] } }).session(session);
        if (!ride) return;
        const offer = await Offer.findOne({ offerId: ride.activeOfferId }).session(session);
        const driver = offer ? await Driver.findOne({ driverId: offer.driverId }).session(session) : null;
        const expected = ride.status === 'offered' ? 'reserved' : 'busy';
        if (!driver || driver.status !== expected || driver.currentRideId !== ride.rideId) await this.resetAssignment(ride, 'driver_unavailable', session);
      });
    }
    const searching = await Ride.find({ rideId: { $type: 'string' }, status: 'searching' }).sort({ createdAt: 1 }).limit(100).lean();
    for (const ride of searching) await this.dispatch(ride.rideId);
  }
}

export function startBookingWorker(service, logger = console) {
  let busy = false;
  const run = async () => {
    if (busy) return;
    busy = true;
    try { await service.tick(); }
    catch { logger.error('Booking worker failed; persisted work will be retried'); }
    finally { busy = false; }
  };
  const timer = setInterval(run, service.config.workerIntervalMs);
  timer.unref(); void run();
  return () => clearInterval(timer);
}
