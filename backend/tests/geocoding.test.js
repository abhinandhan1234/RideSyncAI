import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clearGeocodingCache, reversePlace, searchPlaces } from '../src/services/geocoding.js';

test('place search validates, compacts and caches real geocoder responses', async () => {
  clearGeocodingCache();
  let calls=0,headers;
  const fetcher=async(url,options)=>{
    calls++;headers=options.headers;
    assert.match(String(url),/nominatim\.openstreetmap\.org\/search/);
    return {ok:true,json:async()=>[{name:'Tilakwadi',display_name:'Tilakwadi, Belagavi, Karnataka, India',lat:'15.85',lon:'74.5',type:'suburb'}]};
  };
  assert.deepEqual(await searchPlaces('  '),[]);
  const first=await searchPlaces('Tilakwadi Belagavi',fetcher);
  const cached=await searchPlaces('Tilakwadi  Belagavi',fetcher);
  assert.deepEqual(first[0],{name:'Tilakwadi',address:'Tilakwadi, Belagavi, Karnataka, India',latitude:15.85,longitude:74.5,placeType:'suburb'});
  assert.deepEqual(cached,first);
  assert.equal(calls,1);
  assert.match(headers['User-Agent'],/RideSyncAI/);
});

test('reverse lookup rejects out-of-range coordinates before network access', async()=>{
  let calls=0;
  await assert.rejects(reversePlace(91,74.5,async()=>{calls++;}),/Invalid latitude or longitude/);
  assert.equal(calls,0);
});
