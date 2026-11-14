// Disposable synthetic demo. Starts the same primary server, never the starter.
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Zone, User, Driver as LiveDriver, Ride, DriverApplication } from '../src/models/index.js';
import { spawn } from 'node:child_process';
import { Driver, initializeBookingModels } from '../src/models/booking.js';
const mongo = await MongoMemoryReplSet.create({ replSet:{count:1}, binary:{version:'7.0.24'} });
let server;
try {
  const uri = mongo.getUri('ridesync_disposable_demo');
  await mongoose.connect(uri);
  await initializeBookingModels();
  const demoZones = [
    { code: 'Z01', name: 'Railway Station', center: { type: 'Point', coordinates: [74.507, 15.850] } },
    { code: 'Z02', name: 'Central Bus Stand', center: { type: 'Point', coordinates: [74.510, 15.860] } },
    { code: 'Z03', name: 'Tilakwadi', center: { type: 'Point', coordinates: [74.507, 15.836] } },
    { code: 'Z04', name: 'Udyambag', center: { type: 'Point', coordinates: [74.505, 15.816] } },
    { code: 'Z05', name: 'Nehru Nagar / KLE', center: { type: 'Point', coordinates: [74.516, 15.887] } },
    { code: 'Z06', name: 'Shahapur', center: { type: 'Point', coordinates: [74.520, 15.839] } },
    { code: 'Z07', name: 'Camp', center: { type: 'Point', coordinates: [74.493, 15.852] } },
    { code: 'Z08', name: 'Machhe / VTU', center: { type: 'Point', coordinates: [74.472, 15.812] } }
  ];
  for (const z of demoZones) {
    await Zone.updateOne({ code: z.code }, { $set: z }, { upsert: true });
  }
  await Driver.create([1,2,3].map(n=>({driverId:`D00${n}`,name:`Synthetic Driver ${n}`,isSynthetic:true,
    location:{type:'Point',coordinates:[74.4977+n*0.001,15.8497]},vehicle:{plate:`DEMO-${n}`,capacity:4},zoneCode:'Z01'})));

  const demoPassword = 'DemoPass123!';
  const hash = await bcrypt.hash(demoPassword, 10);
  const captainUser = await User.findOneAndUpdate(
    { email: 'captain@ridesync.demo' },
    { $setOnInsert: { displayName: 'Belagavi Captain 1', email: 'captain@ridesync.demo', passwordHash: hash, role: 'DRIVER', isSynthetic: true } },
    { upsert: true, new: true }
  );
  await LiveDriver.findOneAndUpdate(
    { userId: captainUser._id },
    { $set: { userId: captainUser._id, externalId: 'DEMO-CAPTAIN-1', location: { type: 'Point', coordinates: [74.4987, 15.8497] }, zoneCode: 'Z01', status: 'AVAILABLE', vehicle: { type: 'CAR', capacity: 4, plate: 'KA-22-C-101' }, idleSince: new Date(), lastLocationAt: new Date(), acceptanceRate: 0.95, currentWorkload: 0 } },
    { upsert: true }
  );

  const passengerUser = await User.findOneAndUpdate(
    { email: 'passenger@ridesync.demo' },
    { $setOnInsert: { displayName: 'Demo Passenger', email: 'passenger@ridesync.demo', passwordHash: hash, role: 'PASSENGER', isSynthetic: true } },
    { upsert: true, new: true }
  );

  const adminUser = await User.findOneAndUpdate(
    { email: 'admin@ridesync.demo' },
    { $setOnInsert: { displayName: 'System Administrator', email: 'admin@ridesync.demo', passwordHash: hash, role: 'ADMIN', isSynthetic: true } },
    { upsert: true, new: true }
  );

  await Ride.create([
    {
      passengerId: passengerUser._id,
      driverId: captainUser._id,
      pickup: { type: 'Point', coordinates: [74.4977, 15.8497] },
      dropoff: { type: 'Point', coordinates: [74.5120, 15.8600] },
      pickupZoneCode: 'Z01',
      dropoffZoneCode: 'Z01',
      passengerCount: 1,
      requestedVehicleType: 'CAR',
      routeType: 'fastest',
      status: 'COMPLETED',
      source: 'LIVE',
      distanceKm: 4.2,
      estimatedDurationMin: 12,
      fare: { total: 165, currency: 'INR', surge: 1 },
      requestedAt: new Date(Date.now() - 3600000),
      completedAt: new Date(Date.now() - 2400000)
    },
    {
      passengerId: passengerUser._id,
      driverId: captainUser._id,
      pickup: { type: 'Point', coordinates: [74.5050, 15.8520] },
      dropoff: { type: 'Point', coordinates: [74.5200, 15.8400] },
      pickupZoneCode: 'Z01',
      dropoffZoneCode: 'Z01',
      passengerCount: 2,
      requestedVehicleType: 'CAR',
      routeType: 'eco',
      status: 'COMPLETED',
      source: 'LIVE',
      distanceKm: 5.8,
      estimatedDurationMin: 16,
      fare: { total: 210, currency: 'INR', surge: 1 },
      requestedAt: new Date(Date.now() - 7200000),
      completedAt: new Date(Date.now() - 6000000)
    },
    {
      passengerId: passengerUser._id,
      pickup: { type: 'Point', coordinates: [74.4980, 15.8490] },
      dropoff: { type: 'Point', coordinates: [74.5150, 15.8620] },
      pickupZoneCode: 'Z01',
      dropoffZoneCode: 'Z02',
      passengerCount: 1,
      requestedVehicleType: 'AUTO',
      routeType: 'fastest',
      status: 'CANCELLED',
      source: 'LIVE',
      distanceKm: 3.5,
      estimatedDurationMin: 10,
      fare: { total: 95, currency: 'INR', surge: 1 },
      metadata: { cancellationReason: 'Passenger cancelled: Schedule change' },
      requestedAt: new Date(Date.now() - 5400000),
      cancelledAt: new Date(Date.now() - 5100000)
    },
    {
      passengerId: passengerUser._id,
      pickup: { type: 'Point', coordinates: [74.5100, 15.8550] },
      dropoff: { type: 'Point', coordinates: [74.5300, 15.8350] },
      pickupZoneCode: 'Z02',
      dropoffZoneCode: 'Z03',
      passengerCount: 2,
      requestedVehicleType: 'CAR',
      routeType: 'fastest',
      status: 'CANCELLED',
      source: 'LIVE',
      distanceKm: 6.2,
      estimatedDurationMin: 18,
      fare: { total: 220, currency: 'INR', surge: 1 },
      metadata: { cancellationReason: 'Offer timeout: No available drivers accepted in 20s' },
      requestedAt: new Date(Date.now() - 10800000),
      cancelledAt: new Date(Date.now() - 10500000)
    }
  ]);

  await DriverApplication.create([
    {
      name: 'Ramesh Patil',
      email: 'ramesh.patil@example.com',
      phone: '+919845012345',
      vehicleType: 'AUTO',
      plate: 'KA-22-A-501',
      zoneCode: 'Z02',
      status: 'PROCESSING',
      submittedAt: new Date(Date.now() - 14400000)
    },
    {
      name: 'Sunil Naik',
      email: 'sunil.naik@example.com',
      phone: '+919845098765',
      vehicleType: 'SEDAN',
      plate: 'KA-22-S-902',
      zoneCode: 'Z01',
      status: 'PROCESSING',
      submittedAt: new Date(Date.now() - 28800000)
    },
    {
      name: 'Anand Joshi',
      email: 'anand.joshi@example.com',
      phone: '+919845045678',
      vehicleType: 'CAR',
      plate: 'KA-22-C-303',
      zoneCode: 'Z03',
      status: 'APPROVED',
      submittedAt: new Date(Date.now() - 86400000),
      reviewedAt: new Date(Date.now() - 43200000)
    },
    {
      name: 'Kiran Desai',
      email: 'kiran.desai@example.com',
      phone: '+919845067890',
      vehicleType: 'BIKE',
      plate: 'KA-22-B-112',
      zoneCode: 'Z04',
      status: 'REJECTED',
      submittedAt: new Date(Date.now() - 172800000),
      reviewedAt: new Date(Date.now() - 86400000)
    }
  ]);

  await mongoose.disconnect();
  server = spawn(process.execPath,['src/server.js'],{stdio:'inherit',env:{...process.env,MONGODB_URI:uri,ENABLE_BOOKING_DEMO:'true',JWT_SECRET:randomBytes(32).toString('hex')}});
  console.log('Disposable synthetic demo: drivers D001–D003 + Captain 1 (captain@ridesync.demo). Data disappears on exit.');
  for (const signal of ['SIGINT','SIGTERM']) process.once(signal,()=>server.kill(signal));
  const exitCode = await new Promise((resolve,reject)=>{server.once('exit',resolve);server.once('error',reject);});
  process.exitCode = exitCode || 0;
} finally { await mongoose.disconnect(); await mongo.stop(); }
