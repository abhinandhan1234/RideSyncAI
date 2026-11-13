import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { Driver, Ride, Offer, initializeBookingModels } from '../src/models/booking.js';
import { BookingService } from '../src/services/booking.js';
import { bookingConfig } from '../src/config/booking.js';
import { createApp } from '../src/app.js';

let mongo, server, base, service;
const pickup = { lat:15.8497, lng:74.4977 };
const body = { passengerId:'P001', pickup, dropoff:{ lat:15.8601, lng:74.5112 }, passengerCount:1 };
async function api(path, method='GET', data) {
  const response = await fetch(`${base}/api${path}`, { method, headers:{'Content-Type':'application/json'}, body:data === undefined ? undefined : JSON.stringify(data) });
  return { status:response.status, body:await response.json() };
}
async function drivers(count=2) {
  return Driver.create(Array.from({length:count},(_,i)=>({ driverId:`D00${i+1}`, name:`Synthetic Driver ${i+1}`, isSynthetic:true,
    location:{type:'Point',coordinates:[74.4977+i*0.001,15.8497]}, vehicle:{capacity:4}, zoneCode:'Z01' })));
}
async function book() {
  const response = await api('/rides','POST',body);
  assert.equal(response.status,201,JSON.stringify(response.body)); return response.body;
}
before(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet:{count:1}, binary:{version:'7.0.24'}, instanceOpts:[{storageEngine:'wiredTiger'}] });
  // Always use a disposable local database, never MONGODB_URI.
  await mongoose.connect(mongo.getUri('ridesync_booking_test'));
  await initializeBookingModels();
  service = new BookingService({ config:bookingConfig({OFFER_TIMEOUT_SECONDS:'20'}) });
  server = createApp(service).listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { if(server) await new Promise(resolve=>server.close(resolve)); await mongoose.disconnect(); await mongo?.stop(); });
beforeEach(async () => { await Offer.deleteMany({}); await Ride.deleteMany({}); await Driver.deleteMany({}); });

test('full demonstration: booking, rejection, replacement acceptance, start, complete, history and release',async()=>{
  await drivers();
  let ride = await book();
  assert.equal(ride.status,'offered'); assert.equal(ride.offer.driverId,'D001');
  const firstOffer = ride.offer.offerId;
  assert.equal((await api('/offers/D001')).body.offers.length,1);
  ride = (await api(`/offers/${firstOffer}/reject`,'POST')).body;
  assert.equal(ride.offer.driverId,'D002'); assert.equal(ride.assignmentAttempts,2);
  const accepted = await api(`/offers/${ride.offer.offerId}/accept`,'POST',{driverId:'D002'});
  assert.equal(accepted.status,200); assert.equal(accepted.body.status,'accepted');
  assert.equal(accepted.body.driver.status,'busy');
  assert.equal((await api(`/rides/${ride.rideId}/start`,'POST')).body.status,'in_progress');
  assert.equal((await api(`/rides/${ride.rideId}/complete`,'POST')).body.status,'completed');
  const driver = await Driver.findOne({driverId:'D002'});
  assert.equal(driver.status,'available'); assert.equal(driver.currentRideId,null); assert.equal(driver.completedRides,1);
  const persisted = (await api(`/rides/${ride.rideId}`)).body;
  assert.ok(persisted.completedAt); assert.ok(persisted.assignmentHistory.some(h=>h.reason==='rejected'));
  assert.equal((await Offer.findOne({offerId:firstOffer})).status,'rejected');
  assert.equal((await api('/rides?status=completed&passengerId=P001')).body.rides.length,1);
});
test('selection excludes offline, occupied, over-capacity and distant drivers',async()=>{
  await drivers(5);
  await Driver.updateOne({driverId:'D001'},{$set:{status:'offline'}});
  await Driver.updateOne({driverId:'D002'},{$set:{currentRideId:'OTHER'}});
  await Driver.updateOne({driverId:'D003'},{$set:{'vehicle.capacity':1}});
  await Driver.updateOne({driverId:'D004'},{$set:{location:{type:'Point',coordinates:[0,0]}}});
  const result = await api('/rides','POST',{...body,passengerCount:2});
  assert.equal(result.body.offer.driverId,'D005');
});
test('no drivers returns persisted unassigned ride',async()=>{
  const ride = await book(); assert.equal(ride.status,'unassigned'); assert.equal(ride.offer,null);
});
test('expiration safely retries with concurrent workers and excludes expired driver',async()=>{
  await drivers(); const ride = await book();
  await Offer.updateOne({offerId:ride.offer.offerId},{$set:{expiresAt:new Date(0)}});
  await Promise.all([service.tick(),service.tick()]); await service.tick();
  const updated = await service.details(ride.rideId);
  assert.equal(updated.offer.driverId,'D002'); assert.equal(updated.assignmentAttempts,2);
  assert.equal(await Offer.countDocuments({rideId:ride.rideId,status:'pending'}),1);
  assert.equal((await Driver.findOne({driverId:'D001'})).status,'available');
});
test('late acceptance expires and replaces the offer before returning conflict',async()=>{
  await drivers(); const ride = await book();
  await Offer.updateOne({offerId:ride.offer.offerId},{$set:{expiresAt:new Date(0)}});
  assert.equal((await api(`/offers/${ride.offer.offerId}/accept`,'POST')).status,409);
  assert.equal((await service.details(ride.rideId)).offer.driverId,'D002');
});
test('driver cancellation reassigns, passenger cancellation releases reservation',async()=>{
  await drivers(); let ride = await book();
  await api(`/offers/${ride.offer.offerId}/accept`,'POST');
  ride = (await api(`/rides/${ride.rideId}/cancel`,'POST',{actor:'driver',driverId:'D001'})).body;
  assert.equal(ride.offer.driverId,'D002');
  assert.ok(ride.assignmentHistory.some(h=>h.reason==='driver_cancelled'));
  assert.equal((await api(`/rides/${ride.rideId}/cancel`,'POST')).body.status,'cancelled');
  await service.tick(); assert.equal((await service.details(ride.rideId)).status,'cancelled');
  assert.equal((await Driver.findOne({driverId:'D002'})).currentRideId,null);
});
test('availability before pickup reassigns offered and accepted rides and preserves offline status',async()=>{
  await drivers(3); let ride = await book();
  assert.equal((await api('/drivers/D001/availability','PATCH',{available:false})).status,200);
  ride = await service.details(ride.rideId); assert.equal(ride.offer.driverId,'D002');
  await api(`/offers/${ride.offer.offerId}/accept`,'POST');
  await api('/drivers/D002/availability','PATCH',{available:false});
  assert.equal((await service.details(ride.rideId)).offer.driverId,'D003');
  assert.equal((await Driver.findOne({driverId:'D002'})).status,'offline');
  assert.equal((await api('/drivers/D002/availability','PATCH',{available:true})).body.driver.status,'available');
});
test('worker notices external unavailability before pickup',async()=>{
  await drivers(); const ride = await book();
  await Driver.updateOne({driverId:'D001'},{$set:{status:'offline'}});
  await service.tick(); assert.equal((await service.details(ride.rideId)).offer.driverId,'D002');
});
test('maximum attempts stops reassignment',async()=>{
  await drivers(3); const limited = new BookingService({config:{...service.config,maxAttempts:1}});
  const ride = await limited.create(body); const updated = await limited.respond(ride.offer.offerId,'reject');
  assert.equal(updated.status,'unassigned'); assert.equal(updated.assignmentAttempts,1);
});
test('two simultaneous acceptances succeed exactly once',async()=>{
  await drivers(); const ride = await book();
  const results = await Promise.all([api(`/offers/${ride.offer.offerId}/accept`,'POST'),api(`/offers/${ride.offer.offerId}/accept`,'POST')]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  assert.equal((await service.details(ride.rideId)).assignmentHistory.filter(h=>h.reason==='accepted').length,1);
});
test('old and replacement drivers cannot both accept a ride',async()=>{
  await drivers(); const ride = await book();
  const replacement = await service.respond(ride.offer.offerId,'reject');
  const results = await Promise.all([api(`/offers/${ride.offer.offerId}/accept`,'POST',{driverId:'D001'}),api(`/offers/${replacement.offer.offerId}/accept`,'POST',{driverId:'D002'})]);
  assert.deepEqual(results.map(r=>r.status),[409,200]);
});
test('two rides competing for one driver reserve it once',async()=>{
  await drivers(1);
  const rides = await Promise.all([service.create(body),service.create({...body,passengerId:'P002'})]);
  assert.deepEqual(rides.map(r=>r.status).sort(),['offered','unassigned']);
  assert.equal(await Offer.countDocuments({status:'pending'}),1);
  const offered = rides.find(r=>r.status==='offered');
  assert.equal((await Driver.findOne({driverId:'D001'})).currentRideId,offered.rideId);
});
test('accept racing passenger cancellation leaves no stranded driver',async()=>{
  await drivers(1); const ride = await book();
  await Promise.all([api(`/offers/${ride.offer.offerId}/accept`,'POST'),api(`/rides/${ride.rideId}/cancel`,'POST')]);
  assert.equal((await service.details(ride.rideId)).status,'cancelled');
  assert.equal((await Driver.findOne({driverId:'D001'})).currentRideId,null);
});
test('invalid transitions, ownership, coordinates and filters are rejected',async()=>{
  await drivers(); const ride = await book();
  assert.equal((await api(`/rides/${ride.rideId}/start`,'POST')).status,409);
  assert.equal((await api(`/rides/${ride.rideId}/complete`,'POST')).status,409);
  assert.equal((await api(`/offers/${ride.offer.offerId}/accept`,'POST',{driverId:'D002'})).status,403);
  for (const input of [{...body,pickup:{lat:91,lng:0}},{...body,passengerId:{$ne:null}},{...body,passengerCount:0},{...body,dropoff:{lat:'15',lng:74}}]) {
    assert.equal((await api('/rides','POST',input)).status,400);
  }
  assert.equal((await api('/rides?status=bad')).status,400);
  assert.equal((await api('/rides?passengerId[$ne]=x')).status,400);
  assert.equal((await api('/rides?limit=101')).status,400);
  assert.equal((await api('/rides/missing')).status,404);
  assert.equal((await api('/offers/missing/accept','POST')).status,404);
  assert.equal((await api('/drivers/D001/availability','PATCH',{available:'false'})).status,400);
});
test('location endpoint, GeoJSON booking and driver listing',async()=>{
  await drivers();
  assert.equal((await api('/drivers/D001/location','PATCH',{lat:15.85,lng:74.5})).status,200);
  assert.equal((await api('/drivers/D001/location','PATCH',{lat:0,lng:181})).status,400);
  assert.equal((await api('/drivers/missing/location','PATCH',pickup)).status,404);
  assert.equal((await api('/drivers?status=available')).body.drivers.length,2);
  const result = await api('/rides','POST',{...body,pickup:{type:'Point',coordinates:[74.4977,15.8497]}});
  assert.equal(result.status,201); assert.equal(result.body.pickup.type,'Point');
});
test('transaction abort rolls back reservations and worker resumes persisted searching ride',async()=>{
  await drivers();
  const failing = new BookingService({config:service.config,rank:async()=>[{driverId:'D001',score:1,pickupEtaMinutes:-1,rankingSource:'fallback'}]});
  await assert.rejects(failing.create(body));
  assert.equal((await Driver.findOne({driverId:'D001'})).status,'available');
  assert.equal(await Offer.countDocuments({}),0);
  assert.equal((await Ride.findOne({})).status,'searching');
  await service.tick(); assert.equal((await Ride.findOne({})).status,'offered');
});
test('terminal rides cannot restart, reassign or double-count completion',async()=>{
  await drivers(); const ride = await book();
  await service.respond(ride.offer.offerId,'accept'); await service.transition(ride.rideId,'start');
  assert.equal((await api('/drivers/D001/availability','PATCH',{available:false})).status,409);
  await service.transition(ride.rideId,'complete');
  for (const action of ['start','complete','cancel']) assert.equal((await api(`/rides/${ride.rideId}/${action}`,'POST')).status,409);
  await service.dispatch(ride.rideId); await service.tick();
  assert.equal((await Driver.findOne({driverId:'D001'})).completedRides,1);
});
test('legacy credentials never appear in driver responses; historical records remain untouched',async()=>{
  await drivers();
  await Driver.collection.updateOne({driverId:'D001'},{$set:{passwordHash:'private-hash',email:'private@example.test','vehicle.secret':'private'}});
  await Ride.collection.insertOne({sourceId:'old',status:'HISTORICAL_UNKNOWN',source:'SYNTHETIC_HISTORY'});
  const ride = await book(); await service.respond(ride.offer.offerId,'accept');
  for (const response of [await api('/drivers'),await api(`/rides/${ride.rideId}`),await api('/drivers/D001/location','PATCH',pickup)]) {
    assert.ok(!JSON.stringify(response.body).includes('private'));
  }
  assert.equal((await api('/rides')).body.rides.length,1);
  await service.tick(); assert.equal((await Ride.collection.findOne({sourceId:'old'})).status,'HISTORICAL_UNKNOWN');
});
test('AI outage still creates a usable offer through HTTP',async()=>{
  await drivers();
  const original = service.config;
  service.config = {...original, aiUrl:'http://127.0.0.1:1',aiTimeoutMs:50};
  try { const ride = await book(); assert.equal(ride.offer.rankingSource,'fallback'); }
  finally { service.config = original; }
});
test('background worker automatically expires and reassigns offers',async()=>{
  const {startBookingWorker} = await import('../src/services/booking.js');
  await drivers(); const ride = await book();
  await Offer.updateOne({offerId:ride.offer.offerId},{$set:{expiresAt:new Date(0)}});
  const workerService = new BookingService({config:{...service.config,workerIntervalMs:100}});
  let workerError = false;
  const stop = startBookingWorker(workerService,{error:()=>{workerError=true;}});
  try {
    const deadline = Date.now()+3000;
    while ((await service.details(ride.rideId)).assignmentAttempts===1 && Date.now()<deadline) await new Promise(resolve=>setTimeout(resolve,30));
    assert.equal((await service.details(ride.rideId)).assignmentAttempts,2);
    assert.equal(workerError,false);
  } finally { stop(); }
});
