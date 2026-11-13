import { Router } from 'express';
import { Driver, Ride, Offer, publicDocument, rideStates } from '../models/booking.js';
import { ApiError, bad, identifier, point } from '../services/validation.js';
const wrap = fn => (req,res,next) => Promise.resolve(fn(req,res)).catch(next);
export function bookingRouter(service) {
  const router = Router();
  router.param('id', (req,res,next,value) => { try { identifier(value); next(); } catch(e) { next(e); } });
  for (const key of ['driverId','offerId']) router.param(key, (req,res,next,value) => { try { identifier(value); next(); } catch(e) { next(e); } });
  router.get('/drivers', wrap(async (req,res) => {
    const query = { driverId: { $type: 'string' } };
    if (req.query.status !== undefined) {
      if (!['available','reserved','busy','offline'].includes(req.query.status)) throw bad('Invalid driver status');
      query.status = req.query.status;
    }
    // Explicit projection prevents legacy credentials in shared collections leaking.
    const drivers = await Driver.find(query).select('driverId name location status vehicleType vehicle acceptanceRate completedRides idleMinutes idleSince activeRideCount currentRideId zoneCode isSynthetic').limit(100).lean();
    res.json({ drivers: drivers.map(publicDocument) });
  }));
  router.patch('/drivers/:id/location', wrap(async (req,res) => {
    const driver = await Driver.findOneAndUpdate({ driverId: req.params.id }, { $set: { location: point(req.body) } }, { new:true, runValidators:true });
    if (!driver) throw new ApiError(404,'NOT_FOUND','Driver not found');
    res.json({ driver: publicDocument(driver) });
  }));
  router.patch('/drivers/:id/availability', wrap(async (req,res) => {
    if (typeof req.body?.available !== 'boolean') throw bad('available must be boolean');
    res.json(await service.availability(req.params.id, req.body.available));
  }));
  router.post('/rides', wrap(async (req,res) => res.status(201).json(await service.create(req.body))));
  router.get('/rides', wrap(async (req,res) => {
    const query = { rideId: { $type: 'string' } };
    if (req.query.status !== undefined) {
      if (!rideStates.includes(req.query.status)) throw bad('Invalid ride status');
      query.status = req.query.status;
    }
    if (req.query.passengerId !== undefined) query.passengerId = identifier(req.query.passengerId, 'passengerId');
    const limit = Number(req.query.limit ?? 100), skip = Number(req.query.skip ?? 0);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isSafeInteger(skip) || skip < 0) throw bad('Invalid pagination');
    res.json({ rides: (await Ride.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()).map(publicDocument) });
  }));
  router.get('/rides/:id', wrap(async (req,res) => res.json(await service.details(req.params.id))));
  router.get('/offers/:driverId', wrap(async (req,res) => {
    res.json({ offers: (await Offer.find({ driverId:req.params.driverId, status:'pending', expiresAt:{$gt:new Date()} }).lean()).map(publicDocument) });
  }));
  for (const action of ['accept','reject']) router.post(`/offers/:offerId/${action}`, wrap(async (req,res) => {
    const driverId = req.body?.driverId === undefined ? undefined : identifier(req.body.driverId,'driverId');
    res.json(await service.respond(req.params.offerId, action, driverId));
  }));
  for (const action of ['start','complete','cancel']) router.post(`/rides/:id/${action}`, wrap(async (req,res) => {
    if (action === 'cancel') {
      if (req.body?.actor !== undefined && !['passenger','driver'].includes(req.body.actor)) throw bad('Invalid cancellation actor');
      if (req.body?.actor === 'driver') identifier(req.body.driverId, 'driverId');
    }
    res.json(await service.transition(req.params.id, action, req.body));
  }));
  return router;
}
