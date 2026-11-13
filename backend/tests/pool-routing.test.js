import test from 'node:test';
import assert from 'node:assert/strict';
import { ai } from '../src/services/ps2/client.js';

const a=[74.4998676,15.8506512], b=[74.5037959,15.8507182];
const c=[74.5071624,15.8481], d=[74.5099866,15.8504132];
const requests=[{pickup:a,dropoff:c,seats:1},{pickup:b,dropoff:d,seats:1}];
const plan=(changes={})=>ai('pool',{origin:a,requests,capacity:2,detour:.25,vehicle:'cab',...changes});

test('two distinct journeys share fuel and preserve both direct journey times',async()=>{
  const {pooled,separate}=await plan();
  assert.equal(pooled.legs.length,4);
  assert.equal(pooled.geometry.type,'LineString');
  assert.ok(pooled.fuelLitres<separate.fuelLitres);
  assert.ok(pooled.passengers.every(p=>p.rideMinutes<=1.25*p.separateMinutes));
  assert.ok(Math.abs(pooled.fuelLitres-pooled.legs.reduce((sum,l)=>sum+l.fuelLitres,0))<1e-10);
});
test('pool eligibility rejects excess seats, opposite directions and uncovered points',async()=>{
  assert.equal((await plan({capacity:1})).feasible,false);
  assert.equal((await plan({requests:[requests[0],{pickup:b,dropoff:a,seats:1}]})).reason,'Incompatible travel directions');
  assert.equal((await plan({origin:[0,0]})).source,'ESTIMATE_ONLY');
});
