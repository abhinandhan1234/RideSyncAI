import {createHash,createHmac,timingSafeEqual} from 'node:crypto';

export function getDigiLockerConfig(env=process.env){
  const mode=env.DIGILOCKER_MODE||'demo';
  if(!['demo','live'].includes(mode))throw Object.assign(new Error('DIGILOCKER_MODE must be demo or live'),{status:500,code:'CONFIGURATION_ERROR'});
  const environment=env.CASHFREE_ENV||'sandbox';
  if(!['sandbox','production'].includes(environment))throw Object.assign(new Error('CASHFREE_ENV must be sandbox or production'),{status:500,code:'CONFIGURATION_ERROR'});
  return {mode,environment,clientId:env.CASHFREE_CLIENT_ID||'',clientSecret:env.CASHFREE_CLIENT_SECRET||'',webhookSecret:env.CASHFREE_WEBHOOK_SECRET||''};
}

// Keeps demo records visibly separate; no government-document claims or values are fabricated.
export async function startDigiLockerVerification({documentType}){
  const config=getDigiLockerConfig();
  if(!['AADHAAR','DRIVING_LICENSE'].includes(documentType))throw Object.assign(new Error('Choose Aadhaar or Driving Licence'),{status:400,code:'VALIDATION_ERROR'});
  if(config.mode==='demo')return {mode:'demo',provider:'DEMO',status:'DEMO_VERIFIED',documentType,message:'Simulated verification only. No government document was checked.'};
  if(!config.clientId||!config.clientSecret)throw Object.assign(new Error('Cashfree credentials are not configured'),{status:503,code:'CASHFREE_NOT_CONFIGURED'});
  throw Object.assign(new Error('Live DigiLocker flow is intentionally not enabled until Cashfree access and the documented callback flow are configured.'),{status:503,code:'LIVE_INTEGRATION_PENDING'});
}

export function verifyCashfreeWebhookSignature({rawBody,timestamp,signature,secret,now=Date.now()}){
  if(!Buffer.isBuffer(rawBody)||!timestamp||!signature||!secret)return false;
  const timestampNumber=Number(timestamp);
  if(!Number.isFinite(timestampNumber)||Math.abs(now-timestampNumber)>5*60*1000)return false;
  const expected=createHmac('sha256',secret).update(String(timestamp)).update(rawBody).digest('base64');
  const supplied=Buffer.from(String(signature));
  const calculated=Buffer.from(expected);
  return supplied.length===calculated.length&&timingSafeEqual(supplied,calculated);
}

// Stores only a digest, never the raw webhook body or any returned identity document.
export function cashfreeWebhookPayloadDigest(rawBody){
  if(!Buffer.isBuffer(rawBody))throw new TypeError('Raw webhook body is required');
  return createHash('sha256').update(rawBody).digest('hex');
}
