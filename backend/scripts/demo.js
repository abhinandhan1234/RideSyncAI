// Disposable synthetic demo. Starts the same primary server, never the starter.
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Zone, User, Driver as LiveDriver, Ride } from '../src/models/index.js';
import { spawn } from 'node:child_process';
import { Driver, initializeBookingModels } from '../src/models/booking.js';
const mongo = await MongoMemoryReplSet.create({ replSet:{count:1}, binary:{version:'7.0.24'} });
let server;
try {
  const uri = mongo.getUri('ridesync_disposable_demo');
  await mongoose.connect(uri);
  await initializeBookingModels();
  await Zone.updateOne({code:'Z01'}, {$setOnInsert:{code:'Z01',name:'Belagavi demo zone',center:{type:'Point',coordinates:[74.4977,15.8497]}}}, {upsert:true});
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
    }
  ]);

  await mongoose.disconnect();
  server = spawn(process.execPath,['src/server.js'],{stdio:'inherit',env:{...process.env,MONGODB_URI:uri,ENABLE_BOOKING_DEMO:'true',JWT_SECRET:randomBytes(32).toString('hex')}});
  console.log('Disposable synthetic demo: drivers D001–D003 + Captain 1 (captain@ridesync.demo). Data disappears on exit.');
  for (const signal of ['SIGINT','SIGTERM']) process.once(signal,()=>server.kill(signal));
  const exitCode = await new Promise((resolve,reject)=>{server.once('exit',resolve);server.once('error',reject);});
  process.exitCode = exitCode || 0;
} finally { await mongoose.disconnect(); await mongo.stop(); }
