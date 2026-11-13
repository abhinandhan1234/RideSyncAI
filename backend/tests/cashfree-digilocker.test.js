import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {getDigiLockerConfig,startDigiLockerVerification,verifyCashfreeWebhookSignature} from '../src/services/cashfreeDigiLockerService.js';
import {isAllowedClientOrigin} from '../src/config/client-origins.js';

test('DigiLocker defaults to a clearly isolated demo and never invents document data',async()=>{
  const config=getDigiLockerConfig({});assert.equal(config.mode,'demo');assert.equal(config.environment,'sandbox');
  const result=await startDigiLockerVerification({documentType:'AADHAAR'});
  assert.equal(result.status,'DEMO_VERIFIED');assert.equal(result.provider,'DEMO');assert.match(result.message,/No government document was checked/);
  assert.equal(result.maskedNumber,undefined);assert.equal(result.holderName,undefined);
});

test('DigiLocker configuration rejects unsupported modes and Cashfree environments',()=>{
  assert.throws(()=>getDigiLockerConfig({DIGILOCKER_MODE:'test'}),/DIGILOCKER_MODE/);
  assert.throws(()=>getDigiLockerConfig({CASHFREE_ENV:'dev'}),/CASHFREE_ENV/);
});

test('live DigiLocker start remains unavailable without credentials',async()=>{
  const keys=['DIGILOCKER_MODE','CASHFREE_ENV','CASHFREE_CLIENT_ID','CASHFREE_CLIENT_SECRET'];const prior=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  try{process.env.DIGILOCKER_MODE='live';process.env.CASHFREE_ENV='sandbox';delete process.env.CASHFREE_CLIENT_ID;delete process.env.CASHFREE_CLIENT_SECRET;await assert.rejects(()=>startDigiLockerVerification({documentType:'DRIVING_LICENSE'}),error=>error.status===503&&error.code==='CASHFREE_NOT_CONFIGURED');}
  finally{for(const key of keys)if(prior[key]===undefined)delete process.env[key];else process.env[key]=prior[key];}
});

test('webhook signature checks raw bytes, shared secret and timestamp freshness',()=>{
  const rawBody=Buffer.from('{"event":"demo"}'),secret='test-webhook-secret',timestamp=String(Date.now());
  const signature=createHmac('sha256',secret).update(timestamp).update(rawBody).digest('base64');
  assert.equal(verifyCashfreeWebhookSignature({rawBody,timestamp,signature,secret}),true);
  assert.equal(verifyCashfreeWebhookSignature({rawBody,timestamp,signature,secret:'wrong'}),false);
  assert.equal(verifyCashfreeWebhookSignature({rawBody,timestamp:String(Date.now()-600000),signature,secret}),false);
  assert.equal(verifyCashfreeWebhookSignature({rawBody:Buffer.from('tampered'),timestamp,signature,secret}),false);
});

test('LAN CORS works in development and requires explicit origins in production',()=>{
  const previous=process.env.NODE_ENV;
  try{process.env.NODE_ENV='development';assert.equal(isAllowedClientOrigin('http://192.168.1.42:5173'),true);process.env.NODE_ENV='production';assert.equal(isAllowedClientOrigin('http://192.168.1.42:5173'),false);assert.equal(isAllowedClientOrigin('http://localhost:5173'),true);}
  finally{if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;}
});
