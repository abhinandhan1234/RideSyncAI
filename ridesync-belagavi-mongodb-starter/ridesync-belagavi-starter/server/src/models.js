import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const id = (name) => ({ type: Schema.Types.ObjectId, ref: name });
const money = { type: Number, min: 0, default: 0 };
const pointSchema = new Schema({
  type: { type: String, enum: ['Point'], default: 'Point', required: true },
  coordinates: {
    type: [Number], required: true,
    validate: {
      validator: (a) => Array.isArray(a) && a.length === 2 &&
        Number.isFinite(a[0]) && Number.isFinite(a[1]) &&
        a[0] >= -180 && a[0] <= 180 && a[1] >= -90 && a[1] <= 90,
      message: 'GeoJSON Point coordinates must be [longitude, latitude]'
    }
  }
}, { _id: false });
export const point = (longitude, latitude) => ({ type: 'Point', coordinates: [Number(longitude), Number(latitude)] });

const userSchema = new Schema({
  displayName: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['PASSENGER', 'DRIVER', 'ADMIN'], required: true },
  phone: { type: String, default: null },
  isSynthetic: { type: Boolean, default: false }
}, { timestamps: true });
userSchema.index({ role: 1 });
export const User = model('User', userSchema, 'users');

const zoneSchema = new Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  center: { type: pointSchema, required: true },
  geometry: { type: Schema.Types.Mixed, default: null }, // verified GeoJSON Polygon/MultiPolygon only
  radiusKm: { type: Number, min: 0, default: 2 },
  boundaryVerified: { type: Boolean, default: false },
  source: { type: String, enum: ['DEMO', 'OSM', 'KGIS'], default: 'DEMO' },
  sourceUrl: String
}, { timestamps: true });
zoneSchema.index({ center: '2dsphere' });
// Geometry gets a 2dsphere index only after verified valid polygons have been imported.
export const Zone = model('Zone', zoneSchema, 'zones');

const driverSchema = new Schema({
  userId: { ...id('User'), required: true, unique: true },
  externalId: { type: String, unique: true, sparse: true },
  vehicle: {
    type: { type: String, enum: ['BIKE', 'AUTO', 'CAR'], default: 'CAR' },
    plate: { type: String, default: 'DEMO' },
    capacity: { type: Number, min: 1, max: 8, default: 4 }
  },
  location: { type: pointSchema, required: true },
  zoneCode: { type: String, required: true },
  status: { type: String, enum: ['OFFLINE','AVAILABLE','RESERVED','BUSY'], default: 'OFFLINE' },
  activeRideId: { ...id('Ride'), default: null },
  idleSince: { type: Date, default: Date.now },
  lastLocationAt: { type: Date, default: Date.now },
  acceptanceRate: { type: Number, min: 0, max: 1, default: 0.85 },
  currentWorkload: { type: Number, min: 0, default: 0 },
  completedRides: { type: Number, min: 0, default: 0 },
  acceptedOffers: { type: Number, min: 0, default: 0 },
  totalOffers: { type: Number, min: 0, default: 0 }
}, { timestamps: true });
driverSchema.index({ location: '2dsphere' });
driverSchema.index({ status: 1, zoneCode: 1, lastLocationAt: -1 });
export const Driver = model('Driver', driverSchema, 'drivers');

const rideSchema = new Schema({
  sourceId: { type: String, unique: true, sparse: true },
  passengerId: { ...id('User'), required: true },
  driverId: { ...id('Driver'), default: null },
  pickup: { type: pointSchema, required: true },
  dropoff: { type: pointSchema, required: true },
  pickupZoneCode: { type: String, required: true },
  dropoffZoneCode: { type: String, required: true },
  passengerCount: { type: Number, min: 1, max: 8, default: 1 },
  poolingRequested: { type: Boolean, default: false },
  poolId: { ...id('RidePool'), default: null },
  status: { type: String, enum: ['REQUESTED','OFFERED','ACCEPTED','ARRIVING','IN_PROGRESS','COMPLETED','CANCELLED','FAILED','HISTORICAL_UNKNOWN'], default: 'REQUESTED' },
  source: { type: String, enum: ['LIVE','SYNTHETIC_HISTORY'], default: 'LIVE' },
  metadata: { type: Schema.Types.Mixed, default: {} },
  distanceKm: { type: Number, min: 0, default: 0 },
  pickupEtaMin: { type: Number, min: 0, default: 0 },
  estimatedDurationMin: { type: Number, min: 0, default: 0 },
  fare: { base: money, distance: money, time: money, surge: { type: Number, min: 1, default: 1 }, total: money, currency: { type: String, default: 'INR' } },
  activeOfferId: { ...id('RideOffer'), default: null },
  attemptCount: { type: Number, min: 0, default: 0 },
  requestedAt: { type: Date, default: Date.now },
  acceptedAt: Date, startedAt: Date, completedAt: Date, cancelledAt: Date
}, { timestamps: true });
rideSchema.index({ status: 1, requestedAt: -1 });
rideSchema.index({ pickup: '2dsphere' });
rideSchema.index({ passengerId: 1, requestedAt: -1 });
export const Ride = model('Ride', rideSchema, 'rides');

const offerSchema = new Schema({
  rideId: { ...id('Ride'), required: true },
  driverId: { ...id('Driver'), required: true },
  attempt: { type: Number, min: 1, required: true },
  status: { type: String, enum: ['PENDING','ACCEPTED','REJECTED','EXPIRED','CANCELLED'], default: 'PENDING' },
  score: { type: Number, min: 0, max: 1, default: 0 },
  scoreFactors: Schema.Types.Mixed,
  distanceKm: { type: Number, min: 0, default: 0 },
  estimatedPickupMin: { type: Number, min: 0, default: 0 },
  offeredAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  respondedAt: Date,
  rejectReason: String
}, { timestamps: true });
offerSchema.index({ rideId: 1, attempt: 1 }, { unique: true });
offerSchema.index({ status: 1, expiresAt: 1 });
offerSchema.index({ driverId: 1, offeredAt: -1 });
export const RideOffer = model('RideOffer', offerSchema, 'ride_offers');

const eventSchema = new Schema({
  rideId: { ...id('Ride'), required: true },
  type: { type: String, required: true },
  actorUserId: { ...id('User'), default: null },
  actor: { type: String, enum: ['SYSTEM', 'PASSENGER', 'DRIVER', 'ADMIN'], default: 'SYSTEM' },
  details: { type: Schema.Types.Mixed, default: {} },
  happenedAt: { type: Date, default: Date.now }
}, { timestamps: false });
eventSchema.index({ rideId: 1, happenedAt: 1 });
export const RideEvent = model('RideEvent', eventSchema, 'ride_events');

const demandSchema = new Schema({
  sourceKey: { type: String, required: true, unique: true },
  zoneCode: { type: String, required: true },
  bucketStart: { type: Date, required: true },
  localHour: { type: Number, min: 0, max: 23, required: true },
  localDayOfWeek: { type: Number, min: 0, max: 6, required: true },
  requestCount: { type: Number, min: 0, required: true },
  availableDrivers: { type: Number, min: 0, default: 0 },
  averageWaitMin: { type: Number, min: 0, default: null },
  source: { type: String, enum: ['SYNTHETIC', 'OBSERVED'], default: 'SYNTHETIC' },
  simulationRun: { type: String, default: 'starter-pack' }
}, { timestamps: true });
demandSchema.index({ zoneCode: 1, bucketStart: 1 });
export const DemandHistory = model('DemandHistory', demandSchema, 'demand_history');

const predictionSchema = new Schema({
  zoneCode: { type: String, required: true },
  forecastFor: { type: Date, required: true },
  generatedAt: { type: Date, default: Date.now },
  predictedRequests: { type: Number, min: 0, required: true },
  modelVersion: { type: String, required: true },
  lowerBound: { type: Number, min: 0, default: null },
  upperBound: { type: Number, min: 0, default: null },
  trainingDataSource: { type: String, default: 'SYNTHETIC' }
}, { timestamps: false });
predictionSchema.index({ zoneCode: 1, forecastFor: 1, modelVersion: 1 }, { unique: true });
export const DemandPrediction = model('DemandPrediction', predictionSchema, 'demand_predictions');

const activitySchema = new Schema({
  driverId: { ...id('Driver'), required: true },
  bucketStart: { type: Date, required: true },
  offered: { type: Number, min: 0, default: 0 },
  accepted: { type: Number, min: 0, default: 0 },
  completed: { type: Number, min: 0, default: 0 },
  busyMinutes: { type: Number, min: 0, default: 0 },
  idleMinutes: { type: Number, min: 0, default: 0 },
  earningINR: money
}, { timestamps: true });
activitySchema.index({ driverId: 1, bucketStart: 1 }, { unique: true });
export const DriverActivity = model('DriverActivity', activitySchema, 'driver_activity');

const locationSchema = new Schema({
  driverId: { ...id('Driver'), required: true },
  point: { type: pointSchema, required: true },
  speedKmh: { type: Number, min: 0, max: 180, default: 0 },
  recordedAt: { type: Date, default: Date.now },
  source: { type: String, enum: ['SIMULATED','DEVICE'], default: 'SIMULATED' }
}, { timestamps: false });
locationSchema.index({ driverId: 1, recordedAt: -1 });
export const DriverLocation = model('DriverLocation', locationSchema, 'driver_locations');

const poolSchema = new Schema({
  driverId: { ...id('Driver'), required: true },
  rideIds: [{ ...id('Ride') }],
  stops: [{ rideId: id('Ride'), kind: { type: String, enum: ['PICKUP','DROPOFF'] }, point: pointSchema, order: Number }],
  status: { type: String, enum: ['PROPOSED','CONFIRMED','ACTIVE','COMPLETED','CANCELLED'], default: 'PROPOSED' },
  totalDistanceKm: { type: Number, min: 0, default: 0 },
  estimatedDurationMin: { type: Number, min: 0, default: 0 },
  passengerCount: { type: Number, min: 2, default: 2 },
  estimatedSavingsINR: money
}, { timestamps: true });
poolSchema.index({ driverId: 1, status: 1 });
export const RidePool = model('RidePool', poolSchema, 'ride_pools');

const priceSchema = new Schema({
  zoneCode: { type: String, required: true },
  calculatedAt: { type: Date, required: true, default: Date.now },
  predictedRequests: { type: Number, min: 0, default: 0 },
  availableDrivers: { type: Number, min: 0, default: 0 },
  demandSupplyRatio: { type: Number, min: 0, default: 0 },
  multiplier: { type: Number, min: 1, max: 2, default: 1 },
  baseINR: { type: Number, min: 0, default: 40 },
  perKmINR: { type: Number, min: 0, default: 12 },
  perMinuteINR: { type: Number, min: 0, default: 2 },
  source: { type: String, default: 'SIMULATION' }
}, { timestamps: false });
priceSchema.index({ zoneCode: 1, calculatedAt: -1 });
export const ZonePricing = model('ZonePricing', priceSchema, 'zone_pricing');

const simulationSchema = new Schema({
  label: { type: String, required: true, unique: true },
  seed: { type: Number, required: true },
  dataSource: { type: String, default: 'SYNTHETIC' },
  sourceFilenames: [String],
  importedAt: { type: Date, default: Date.now },
  counts: Schema.Types.Mixed,
  notes: String
}, { timestamps: true });
export const SimulationRun = model('SimulationRun', simulationSchema, 'simulation_runs');
