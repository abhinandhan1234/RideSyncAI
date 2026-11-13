// Disposable synthetic demo. Starts the same primary server, never the starter.
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import { Zone } from '../src/models/index.js';
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
  await mongoose.disconnect();
  server = spawn(process.execPath,['src/server.js'],{stdio:'inherit',env:{...process.env,MONGODB_URI:uri,ENABLE_BOOKING_DEMO:'true',JWT_SECRET:randomBytes(32).toString('hex')}});
  console.log('Disposable synthetic demo: drivers D001–D003 near 15.8497, 74.4977. Data disappears on exit.');
  for (const signal of ['SIGINT','SIGTERM']) process.once(signal,()=>server.kill(signal));
  const exitCode = await new Promise((resolve,reject)=>{server.once('exit',resolve);server.once('error',reject);});
  process.exitCode = exitCode || 0;
} finally { await mongoose.disconnect(); await mongo.stop(); }
