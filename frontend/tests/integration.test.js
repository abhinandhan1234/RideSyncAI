import { test } from 'node:test';
import assert from 'node:assert/strict';
import {bookingPayload,validLocation,routeFromResponse,routePoint} from '../src/services/ride-utils.js';
import {apiRequest} from '../src/services/api.js';
const pickup={lat:15.8497,lng:74.4977},dropoff={lat:15.86,lng:74.51};
test('map selections become authenticated booking GeoJSON coordinates',()=>{
  const namedPickup={...pickup,name:'Tilakwadi, Belagavi'},namedDropoff={...dropoff,name:'Belagavi Railway Station'};
  assert.deepEqual(bookingPayload({pickup:namedPickup,dropoff:namedDropoff,passengerCount:2,routeType:'fastest'}),{pickup:{type:'Point',coordinates:[74.4977,15.8497]},dropoff:{type:'Point',coordinates:[74.51,15.86]},pickupAddress:'Tilakwadi, Belagavi',dropoffAddress:'Belagavi Railway Station',passengerCount:2,routeType:'fastest',vehicleType:'car'});
  assert.throws(()=>bookingPayload({pickup:{lat:91,lng:0},dropoff}));
  assert.throws(()=>bookingPayload({pickup,dropoff,passengerCount:0}));
  assert.throws(()=>bookingPayload({pickup,dropoff,routeType:'invented'}));
  assert.equal(Boolean(validLocation(null)),false);
});
const data={code:'Ok',routes:[{distance:2000,duration:200,geometry:{coordinates:[[74.4977,15.8497],[74.505,15.853],[74.51,15.86]]}},{distance:1800,duration:250,geometry:{coordinates:[[74.4977,15.8497],[74.51,15.86]]}}]};
test('road route selection retains fastest and shortest choices without inventing savings',()=>{
  const fastest=routeFromResponse(data,'fastest'),shortest=routeFromResponse(data,'shortest');
  assert.equal(fastest.km,2);assert.equal(shortest.km,1.8);assert.equal(fastest.saved,0);assert.ok(Math.abs(shortest.saved-.013)<1e-8);
  assert.deepEqual(routePoint(shortest,0),pickup);assert.deepEqual(routePoint(shortest,1),dropoff);
  assert.equal(validLocation(routePoint(shortest,.5)),true);
  assert.throws(()=>routeFromResponse({code:'NoRoute',routes:[]}));
  assert.throws(()=>routeFromResponse({code:'Ok',routes:[{distance:5,duration:1,geometry:{coordinates:[[0,95],[1,96]]}}]}));
});
test('booking API sends actual token and data; backend and network errors remain errors',async()=>{
  let captured;
  const result=await apiRequest('/rides',{method:'POST',token:'test-token',body:bookingPayload({pickup:{...pickup,name:'Camp, Belagavi'},dropoff:{...dropoff,name:'Shahapur, Belagavi'}})},async(url,options)=>{captured={url,options};return{ok:true,json:async()=>({rideId:'stored',status:'REQUESTED'})};});
  assert.equal(captured.url,'/api/rides');assert.equal(captured.options.headers.Authorization,'Bearer test-token');assert.deepEqual(JSON.parse(captured.options.body).pickup.coordinates,[74.4977,15.8497]);assert.equal(result.rideId,'stored');
  await assert.rejects(apiRequest('/rides',{},async()=>({ok:false,status:401,json:async()=>({message:'Valid Bearer token required'})})),/Valid Bearer/);
  await assert.rejects(apiRequest('/rides',{},async()=>{throw new Error('network');}),/Cannot reach/);
});
