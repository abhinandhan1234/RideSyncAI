import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { rankDrivers, fallbackRanking, haversineKm } from '../src/services/ranking.js';
import { bookingConfig } from '../src/config/booking.js';
import { point, identifier } from '../src/services/validation.js';
const config = {...bookingConfig({}),aiUrl:'http://ai.test',aiTimeoutMs:20};
const location = {type:'Point',coordinates:[74.4977,15.8497]};
const ride = {rideId:'R1',pickup:location};
const drivers = ['D2','D1'].map(driverId=>({driverId,location,acceptanceRate:0.85,idleMinutes:12,idleSince:new Date(0),activeRideCount:0}));
const expected = fallbackRanking(ride,drivers);
test('fallback ranking is deterministic with ID tie-break and bounded distance',()=>{
  assert.equal(haversineKm(location,location),0);
  assert.equal(expected[0].driverId,'D1');
  assert.ok(Number.isFinite(haversineKm({coordinates:[0,0]},{coordinates:[180,0]})));
  assert.ok(expected[0].pickupEtaMinutes>=0);
});
test('valid AI rankings preserve ordering and fill omitted eligible drivers',async()=>{
  let request;
  const ranked = await rankDrivers(ride,drivers,config,async(url,options)=>{
    assert.equal(url,'http://ai.test/rank-drivers'); request = JSON.parse(options.body);
    return {ok:true,json:async()=>({rankedDrivers:[{driverId:'D2',score:0.9,pickupEtaMinutes:4.5}]})};
  });
  assert.deepEqual(request.pickup,{lng:74.4977,lat:15.8497});
  assert.equal(request.drivers[0].activeRideCount,0);
  assert.deepEqual(ranked.map(r=>r.driverId),['D2','D1']);
  assert.deepEqual(ranked.map(r=>r.rankingSource),['ai','fallback']);
});
test('unavailable AI, bad status, invalid JSON and malformed candidates fall back',async()=>{
  const invalid = [null,[],[{driverId:'unknown',score:1,pickupEtaMinutes:1}],
    [{driverId:'D1',score:'1',pickupEtaMinutes:1}], [{driverId:'D1',score:1,pickupEtaMinutes:-1}],
    [{driverId:'D1',score:1,pickupEtaMinutes:1},{driverId:'D1',score:1,pickupEtaMinutes:1}]];
  for (const rankedDrivers of invalid) assert.deepEqual(await rankDrivers(ride,drivers,config,async()=>({ok:true,json:async()=>({rankedDrivers})})),expected);
  for (const fetcher of [async()=>{throw new Error('unavailable');},async()=>({ok:false}),async()=>({ok:true,json:async()=>{throw new Error('bad json');}})]) {
    assert.deepEqual(await rankDrivers(ride,drivers,config,fetcher),expected);
  }
});
test('actual HTTP timeout falls back without hanging booking',async()=>{
  const server = http.createServer((_req,_res)=>{}).listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  try {
    const start = Date.now();
    assert.deepEqual(await rankDrivers(ride,drivers,{...config,aiUrl:`http://127.0.0.1:${server.address().port}`}),expected);
    assert.ok(Date.now()-start<2000);
  } finally { server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); }
});
test('disabled AI and zero candidates skip network',async()=>{
  const fail=()=>{throw new Error('must not call');};
  assert.deepEqual(await rankDrivers(ride,drivers,{...config,aiUrl:''},fail),expected);
  assert.deepEqual(await rankDrivers(ride,[],config,fail),[]);
});
test('configuration and coordinate validation reject invalid values',()=>{
  for (const env of [{MAX_ASSIGNMENT_ATTEMPTS:'0'},{OFFER_TIMEOUT_SECONDS:'NaN'},{AI_ENGINE_URL:'file:///tmp/ai'},{MAX_PICKUP_KM:'-1'}]) assert.throws(()=>bookingConfig(env));
  assert.deepEqual(point({lat:0,lng:0}),{type:'Point',coordinates:[0,0]});
  for (const input of [null,{lat:NaN,lng:0},{type:'Point',coordinates:[1,2,3]}]) assert.throws(()=>point(input));
  assert.throws(()=>identifier({$ne:null}));
});
