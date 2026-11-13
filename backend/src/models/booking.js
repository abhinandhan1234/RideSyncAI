import mongoose from 'mongoose';
const { Schema } = mongoose;
const point = new Schema({
  type: { type: String, enum: ['Point'], default: 'Point', required: true },
  coordinates: { type: [Number], required: true, validate: a => a.length === 2 && a.every(Number.isFinite) && Math.abs(a[0]) <= 180 && Math.abs(a[1]) <= 90 },
}, { _id: false });
const id = { type: String, required: true, match: /^[A-Za-z0-9_-]{1,100}$/ };
const options = { timestamps: true, autoIndex: false };
const driver = new Schema({
  driverId: id, name: { type: String, required: true, maxlength: 100 },
  location: { type: point, required: true },
  status: { type: String, enum: ['available','reserved','busy','offline'], default: 'available' },
  vehicleType: { type: String, default: 'car' },
  vehicle: { plate: String, capacity: { type: Number, min: 1, max: 8, default: 4 } },
  acceptanceRate: { type: Number, min: 0, max: 1, default: 0.85 },
  completedRides: { type: Number, min: 0, default: 0 },
  idleMinutes: { type: Number, min: 0, default: 0 }, idleSince: { type: Date, default: Date.now },
  activeRideCount: { type: Number, min: 0, default: 0 },
  currentRideId: { type: String, default: null },
  zoneCode: { type: String, match: /^Z0[1-8]$/ },
  isSynthetic: { type: Boolean, default: false },
}, options);
// Partial indexes leave historical documents without the new IDs untouched.
driver.index({ driverId: 1 }, { unique: true, partialFilterExpression: { driverId: { $type: 'string' } } });
driver.index({ status: 1, currentRideId: 1 });
driver.index({ location: '2dsphere' }, { partialFilterExpression: { driverId: { $type: 'string' } } });
export const rideStates = ['requested','searching','offered','accepted','in_progress','completed','cancelled','unassigned'];
const history = new Schema({ at: { type: Date, required: true }, reason: { type: String, required: true }, driverId: String, offerId: String }, { _id: false });
const ride = new Schema({
  rideId: id, passengerId: id, pickup: { type: point, required: true }, dropoff: { type: point, required: true },
  passengerCount: { type: Number, min: 1, max: 8, default: 1 },
  status: { type: String, enum: rideStates, default: 'requested' },
  assignedDriverId: { type: String, default: null }, activeOfferId: { type: String, default: null },
  assignmentAttempts: { type: Number, default: 0, min: 0 },
  assignmentHistory: { type: [history], default: [] },
  acceptedAt: Date, startedAt: Date, completedAt: Date, cancelledAt: Date,
}, options);
ride.index({ rideId: 1 }, { unique: true, partialFilterExpression: { rideId: { $type: 'string' } } });
ride.index({ passengerId: 1, createdAt: -1 });
ride.index({ status: 1, createdAt: 1 });
ride.index({ pickup: '2dsphere' }, { partialFilterExpression: { rideId: { $type: 'string' } } });
const offer = new Schema({
  offerId: id, rideId: id, driverId: id, attempt: { type: Number, min: 1, required: true },
  status: { type: String, enum: ['pending','accepted','rejected','expired','cancelled'], default: 'pending' },
  expiresAt: { type: Date, required: true }, respondedAt: Date,
  score: { type: Number, required: true }, pickupEtaMinutes: { type: Number, min: 0, required: true },
  rankingSource: { type: String, enum: ['ai','fallback'], required: true },
}, options);
offer.index({ offerId: 1 }, { unique: true });
offer.index({ rideId: 1, attempt: 1 }, { unique: true });
offer.index({ rideId: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });
offer.index({ driverId: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });
offer.index({ status: 1, expiresAt: 1 });
export const Driver = mongoose.model('BookingDriver', driver, 'drivers');
export const Ride = mongoose.model('BookingRide', ride, 'rides');
export const Offer = mongoose.model('BookingOffer', offer, 'offers');
export async function initializeBookingModels() {
  // Never syncIndexes(): it can drop teammates' indexes.
  for (const model of [Driver, Ride, Offer]) await model.createIndexes();
}
export function publicDocument(doc) {
  if (!doc) return null;
  const value = doc.toObject ? doc.toObject() : doc;
  const schema = value.offerId ? offer : value.rideId ? ride : driver;
  // Shared collections can contain legacy fields, including authentication data.
  // Only return fields this booking model owns, even for lean query results.
  const keys = new Set(Object.keys(schema.paths).map(path => path.split('.')[0]));
  keys.delete('_id'); keys.delete('__v');
  const result = Object.fromEntries(Object.entries(value).filter(([key]) => keys.has(key)));
  if (result.vehicle) result.vehicle = { plate: result.vehicle.plate, capacity: result.vehicle.capacity };
  return result;
}
