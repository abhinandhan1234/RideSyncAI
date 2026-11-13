import {Router} from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile,unlink} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {User,Driver,Zone,CashfreeWebhookReceipt} from '../models/index.js';
import {getDigiLockerConfig,startDigiLockerVerification,verifyCashfreeWebhookSignature,cashfreeWebhookPayloadDigest} from '../services/cashfreeDigiLockerService.js';

const router=Router();const adminRouter=Router();const webhookRouter=Router();
const fail=(status,code,message)=>Object.assign(new Error(message),{status,code});
const run=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
const uploadDirectory=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../uploads');
const phoneValue=value=>String(value||'').replace(/[\s()-]/g,'').replace(/^0(?=[1-9])/,'+91');
const validPhone=value=>/^\+?[1-9]\d{9,14}$/.test(value);
const safeUser=user=>({_id:String(user._id),name:user.displayName,email:user.email||'',phone:user.phone,role:user.role.toLowerCase()});
const tokenFor=user=>jwt.sign({sub:String(user._id),role:user.role},secret(),{expiresIn:'8h'});
function secret(){if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32)throw fail(500,'CONFIGURATION_ERROR','JWT_SECRET must contain at least 32 characters');return process.env.JWT_SECRET;}
function auth(req,_res,next){try{const token=/^Bearer (.+)$/i.exec(req.headers.authorization||'')?.[1];req.user=jwt.verify(token,secret());next();}catch{next(fail(401,'UNAUTHORIZED','Valid Bearer token required'));}}
const role=expected=>(req,_res,next)=>req.user.role===expected?next():next(fail(403,'FORBIDDEN','Role is not authorized'));
const driverOnly=[auth,role('DRIVER')];
const driverFor=userId=>Driver.findOne({userId});
const profileProjection=driver=>({approvalStatus:driver.approvalStatus||'INCOMPLETE',approvalNote:driver.approvalNote||'',availability:driver.status==='AVAILABLE'?'ONLINE':driver.status==='ON_TRIP'?'ON_TRIP':'OFFLINE',activeRideId:driver.activeRideId?String(driver.activeRideId):null,profile:driver.profile||{},verification:driver.verification||{},vehicle:driver.vehicle||{},payment:driver.payment||{},rating:driver.rating??null,completedRides:driver.completedRides||0});

router.post('/register',run(async(req,res)=>{
  const {fullName,email,password,address,city,vehicleCategory,manufacturer,model,registrationNumber,vehicleColor,vehicleRcDetails,upiId,upiAccountHolder,preferredPaymentMethod}=req.body;
  const phone=phoneValue(req.body.phone);
  if(typeof fullName!=='string'||fullName.trim().length<2||fullName.trim().length>100||!validPhone(phone)||typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email)||typeof password!=='string'||password.length<8||typeof address!=='string'||address.trim().length<5||typeof city!=='string'||city.trim().length<2)throw fail(400,'VALIDATION_ERROR','Enter a valid name, phone, email, password, address and city.');
  if(!['BIKE','AUTO','CAR'].includes(vehicleCategory)||typeof manufacturer!=='string'||manufacturer.trim().length<1||typeof model!=='string'||model.trim().length<1||typeof registrationNumber!=='string'||registrationNumber.trim().length<4)throw fail(400,'VALIDATION_ERROR','Complete the vehicle category, manufacturer, model and registration number.');
  const cleanUpi=typeof upiId==='string'?upiId.trim():'';
  if(cleanUpi&&!/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/.test(cleanUpi))throw fail(400,'INVALID_UPI','Enter a valid UPI ID (e.g. name@bank or 9876543210@upi). Never enter a PIN or bank name alone.');
  const user=new User({displayName:fullName.trim(),email:email.trim().toLowerCase(),phone,passwordHash:await bcrypt.hash(password,12),role:'DRIVER',isSynthetic:false});
  try{await user.save();}catch(error){if(error.code===11000){const key=Object.keys(error.keyPattern||{})[0];throw fail(409,key==='phone'?'PHONE_EXISTS':'ACCOUNT_EXISTS',key==='phone'?'This phone number is already registered.':'An account already uses this email address.');}throw error;}
  try{
    const driver=await Driver.create({userId:user._id,status:'OFFLINE',approvalStatus:'PENDING_REVIEW',profile:{address:address.trim(),city:city.trim()},verification:{aadhaar:{status:'NOT_STARTED'},drivingLicense:{status:'NOT_STARTED'}},vehicle:{type:vehicleCategory,manufacturer:manufacturer.trim(),model:model.trim(),plate:registrationNumber.trim().toUpperCase(),color:String(vehicleColor||'').trim(),rcDetails:String(vehicleRcDetails||'').trim(),capacity:vehicleCategory==='CAR'?4:vehicleCategory==='AUTO'?3:1},payment:{upiId:String(upiId||'').trim(),accountHolderName:String(upiAccountHolder||'').trim(),preferredMethod:preferredPaymentMethod||'UPI'}});
    res.status(201).json({accessToken:tokenFor(user),user:safeUser(user),driver:profileProjection(driver)});
  }catch(error){await User.deleteOne({_id:user._id});throw error;}
}));

router.post('/login',run(async(req,res)=>{
  const phone=phoneValue(req.body.phone);const user=await User.findOne({phone,role:'DRIVER'}).select('+passwordHash');
  if(!user||!await bcrypt.compare(String(req.body.password||''),user.passwordHash))throw fail(401,'INVALID_CREDENTIALS','Invalid phone number or password.');
  res.json({accessToken:tokenFor(user),user:safeUser(user),driver:profileProjection(await driverFor(user._id))});
}));

router.get('/profile',...driverOnly,run(async(req,res)=>{
  const user=await User.findById(req.user.sub).select('displayName email phone').lean();const driver=await driverFor(req.user.sub).lean();
  if(!user||!driver)throw fail(404,'NOT_FOUND','Sarathi profile not found.');
  res.json({user:{name:user.displayName,email:user.email||'',phone:user.phone},driver:profileProjection(driver)});
}));

router.patch('/profile',...driverOnly,run(async(req,res)=>{
  const allowed=['fullName','phone','email','address','city','vehicleCategory','manufacturer','model','registrationNumber','vehicleColor','vehicleRcDetails','upiId','upiAccountHolder','preferredPaymentMethod'];
  if(Object.keys(req.body).some(key=>!allowed.includes(key)))throw fail(400,'VALIDATION_ERROR','Only profile, vehicle and payment fields can be updated here.');
  const sets={};const b=req.body;const userSet={};
  if('fullName'in b){if(typeof b.fullName!=='string'||b.fullName.trim().length<2||b.fullName.trim().length>100)throw fail(400,'VALIDATION_ERROR','Enter a valid full name.');userSet.displayName=b.fullName.trim();}
  if('phone'in b){const phone=phoneValue(b.phone);if(!validPhone(phone))throw fail(400,'VALIDATION_ERROR','Enter a valid phone number.');userSet.phone=phone;}
  if('email'in b){if(typeof b.email!=='string'||!/^\S+@\S+\.\S+$/.test(b.email.trim()))throw fail(400,'VALIDATION_ERROR','Enter a valid email address.');userSet.email=b.email.trim().toLowerCase();}
  if('address'in b){if(typeof b.address!=='string'||b.address.trim().length<5)throw fail(400,'VALIDATION_ERROR','Enter a valid residential address.');sets['profile.address']=b.address.trim();}
  if('city'in b){if(typeof b.city!=='string'||b.city.trim().length<2)throw fail(400,'VALIDATION_ERROR','Enter a valid city.');sets['profile.city']=b.city.trim();}
  if('vehicleCategory'in b){if(!['BIKE','AUTO','CAR'].includes(b.vehicleCategory))throw fail(400,'VALIDATION_ERROR','Choose Bike, Auto or Car.');sets['vehicle.type']=b.vehicleCategory;sets['vehicle.capacity']=b.vehicleCategory==='CAR'?4:b.vehicleCategory==='AUTO'?3:1;}
  for(const [field,key,min] of [['manufacturer','vehicle.manufacturer',1],['model','vehicle.model',1],['registrationNumber','vehicle.plate',4],['vehicleColor','vehicle.color',0],['vehicleRcDetails','vehicle.rcDetails',0],['upiAccountHolder','payment.accountHolderName',0]])if(field in b){if(typeof b[field]!=='string'||b[field].trim().length<min)throw fail(400,'VALIDATION_ERROR',`Invalid ${field}.`);sets[key]=field==='registrationNumber'?b[field].trim().toUpperCase():b[field].trim();}
  if('upiId'in b){if(b.upiId&&!/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/.test(b.upiId))throw fail(400,'INVALID_UPI','Enter a valid UPI ID. Never enter a PIN or OTP.');sets['payment.upiId']=b.upiId.trim();}
  if('preferredPaymentMethod'in b){if(!['UPI','CASH','BOTH'].includes(b.preferredPaymentMethod))throw fail(400,'VALIDATION_ERROR','Choose UPI, cash or both.');sets['payment.preferredMethod']=b.preferredPaymentMethod;}
  if(Object.keys(userSet).length)try{await User.findByIdAndUpdate(req.user.sub,{$set:userSet},{new:true,runValidators:true});}catch(error){if(error.code===11000)throw fail(409,Object.keys(error.keyPattern||{})[0]==='phone'?'PHONE_EXISTS':'ACCOUNT_EXISTS','Phone or email is already in use.');throw error;}
  const driver=await Driver.findOneAndUpdate({userId:req.user.sub},{$set:sets},{new:true,runValidators:true});if(!driver)throw fail(404,'NOT_FOUND','Sarathi profile not found.');res.json({driver:profileProjection(driver)});
}));

router.patch('/availability',...driverOnly,run(async(req,res)=>{
  const {availability}=req.body;if(!['ONLINE','OFFLINE'].includes(availability))throw fail(400,'VALIDATION_ERROR','Availability must be ONLINE or OFFLINE.');
  const driver=await driverFor(req.user.sub);if(!driver)throw fail(404,'NOT_FOUND','Sarathi profile not found.');
  if(driver.activeRideId)throw fail(409,'DRIVER_BUSY','Availability cannot change while a ride is active.');
  if(availability==='ONLINE'){
    if(process.env.NODE_ENV==='production'&&(!['APPROVED'].includes(driver.approvalStatus)||driver.verification?.aadhaar?.status!=='VERIFIED'||driver.verification?.aadhaar?.provider!=='CASHFREE'||driver.verification?.aadhaar?.mode!=='live'||driver.verification?.drivingLicense?.status!=='VERIFIED'||driver.verification?.drivingLicense?.provider!=='CASHFREE'||driver.verification?.drivingLicense?.mode!=='live'))throw fail(403,'VERIFICATION_REQUIRED','Production availability requires account approval and live Aadhaar and Driving Licence verification.');
    const lat=Number(req.body.latitude),lng=Number(req.body.longitude);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)throw fail(400,'LOCATION_REQUIRED','Share your current location to go online.');
    const zone=await Zone.findOne({center:{$near:{$geometry:{type:'Point',coordinates:[lng,lat]},$maxDistance:5000}}}).lean();if(!zone)throw fail(400,'OUTSIDE_SERVICE_AREA','Online service is available only in the supported Belagavi zones.');
    driver.location={type:'Point',coordinates:[lng,lat]};driver.locationSource='GPS';driver.zoneCode=zone.code;driver.lastLocationAt=new Date();driver.status='AVAILABLE';driver.idleSince=new Date();await driver.save();
  }else{driver.status='OFFLINE';await driver.save();}
  res.json({availability:driver.status==='AVAILABLE'?'ONLINE':'OFFLINE',status:driver.status,updatedAt:driver.updatedAt});
}));

async function savePhoto(req,kind){
  const dataUrl=req.body?.dataUrl;const match=typeof dataUrl==='string'&&/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if(!match)throw fail(400,'INVALID_IMAGE','Upload a JPEG, PNG or WebP image.');
  const bytes=Buffer.from(match[2],'base64');if(!bytes.length||bytes.length>2*1024*1024)throw fail(413,'IMAGE_TOO_LARGE','Image must be smaller than 2 MB.');
  const imageOk=match[1]==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):match[1]==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
  if(!imageOk)throw fail(400,'INVALID_IMAGE','Image file content does not match its type.');
  const filename=`${randomUUID()}.${match[1]==='image/jpeg'?'jpg':match[1].split('/')[1]}`;await mkdir(uploadDirectory,{recursive:true});await writeFile(path.join(uploadDirectory,filename),bytes,{flag:'wx'});
  const field=kind==='profile'?'profile.photoUrl':'vehicle.photoUrl';const driver=await Driver.findOneAndUpdate({userId:req.user.sub},{$set:{[field]:`/uploads/${filename}`}},{new:true});
  if(!driver)throw fail(404,'NOT_FOUND','Sarathi profile not found.');return driver;
}
async function removePhoto(userId,kind){const field=kind==='profile'?'profile.photoUrl':'vehicle.photoUrl';const driver=await Driver.findOne({userId});if(!driver)throw fail(404,'NOT_FOUND','Sarathi profile not found.');const previous=driver.get(field);driver.set(field,null);await driver.save();if(previous){const filename=path.basename(previous);if(/^[0-9a-f-]{36}\.(?:jpg|png|webp)$/.test(filename))await unlink(path.join(uploadDirectory,filename)).catch(()=>{});}return driver;}
router.post('/upload/profile-photo',...driverOnly,run(async(req,res)=>res.status(201).json({photoUrl:(await savePhoto(req,'profile')).profile.photoUrl})));
router.post('/upload/vehicle-photo',...driverOnly,run(async(req,res)=>res.status(201).json({photoUrl:(await savePhoto(req,'vehicle')).vehicle.photoUrl})));
router.delete('/upload/profile-photo',...driverOnly,run(async(req,res)=>{const driver=await removePhoto(req.user.sub,'profile');res.json({photoUrl:driver.profile?.photoUrl||null});}));
router.delete('/upload/vehicle-photo',...driverOnly,run(async(req,res)=>{const driver=await removePhoto(req.user.sub,'vehicle');res.json({photoUrl:driver.vehicle?.photoUrl||null});}));

router.post('/verification/digilocker/start',...driverOnly,run(async(req,res)=>{
  const documentType=String(req.body.documentType||'').toUpperCase();const result=await startDigiLockerVerification({documentType});const key=documentType==='AADHAAR'?'aadhaar':'drivingLicense';
  const driver=await driverFor(req.user.sub);if(!driver)throw fail(404,'NOT_FOUND','Sarathi profile not found.');
  if(result.mode==='demo')driver.set(`verification.${key}`,{status:'DEMO_VERIFIED',provider:'DEMO',mode:'demo',lastError:null,verifiedAt:new Date()});else driver.set(`verification.${key}`,{status:'PENDING',provider:'CASHFREE',mode:'live'});
  await driver.save();res.json({...result,verification:driver.verification[key]});
}));
router.get('/verification/digilocker/status',...driverOnly,run(async(req,res)=>{
  const type=String(req.query.document||'').toUpperCase();if(!['AADHAAR','DRIVING_LICENSE'].includes(type))throw fail(400,'VALIDATION_ERROR','document must be AADHAAR or DRIVING_LICENSE.');
  const driver=await driverFor(req.user.sub);if(!driver)throw fail(404,'NOT_FOUND','Sarathi profile not found.');res.json({documentType:type,verification:driver.verification?.[type==='AADHAAR'?'aadhaar':'drivingLicense']||{status:'NOT_STARTED'}});
}));

adminRouter.get('/sarathi',auth,role('ADMIN'),run(async(_req,res)=>{
  const drivers=await Driver.find({approvalStatus:{$in:['PENDING_REVIEW','NEEDS_CORRECTION']}}).populate('userId','displayName email phone').sort({createdAt:1}).lean();
  res.json({drivers:drivers.map(d=>({driverId:String(d._id),user:d.userId?{name:d.userId.displayName,email:d.userId.email,phone:d.userId.phone}:null,approvalStatus:d.approvalStatus,profile:d.profile,vehicle:d.vehicle,verification:{aadhaar:{status:d.verification?.aadhaar?.status,provider:d.verification?.aadhaar?.provider,mode:d.verification?.aadhaar?.mode},drivingLicense:{status:d.verification?.drivingLicense?.status,provider:d.verification?.drivingLicense?.provider,mode:d.verification?.drivingLicense?.mode}}}))});
}));
adminRouter.patch('/sarathi/:driverId/approval',auth,role('ADMIN'),run(async(req,res)=>{
  const {status,note}=req.body;if(!['APPROVED','REJECTED','NEEDS_CORRECTION'].includes(status)||!mongoose.isValidObjectId(req.params.driverId))throw fail(400,'VALIDATION_ERROR','Choose APPROVED, REJECTED or NEEDS_CORRECTION for a valid Sarathi.');
  if(status!=='APPROVED'&&(!note||String(note).trim().length<3))throw fail(400,'VALIDATION_ERROR','Add a brief note for rejection or requested corrections.');
  const driver=await Driver.findByIdAndUpdate(req.params.driverId,{$set:{approvalStatus:status,approvalNote:String(note||'').trim().slice(0,500),approvedAt:status==='APPROVED'?new Date():null,approvedBy:status==='APPROVED'?req.user.sub:null}},{new:true});if(!driver)throw fail(404,'NOT_FOUND','Sarathi profile not found.');res.json({driverId:String(driver._id),approvalStatus:driver.approvalStatus});
}));

// Signature verification is prepared here. Live event parsing/state transitions remain disabled until the documented Cashfree flow is configured.
webhookRouter.post('/cashfree/digilocker',run(async(req,res)=>{
  const config=getDigiLockerConfig();if(config.mode!=='live')throw fail(409,'DEMO_MODE','Cashfree webhooks are disabled in demo mode.');if(!config.webhookSecret||!config.clientId||!config.clientSecret)throw fail(503,'CASHFREE_NOT_CONFIGURED','Cashfree credentials and webhook secret are not configured.');
  if(!verifyCashfreeWebhookSignature({rawBody:req.rawBody,timestamp:req.get('x-webhook-timestamp'),signature:req.get('x-webhook-signature'),secret:config.webhookSecret}))throw fail(401,'INVALID_SIGNATURE','Cashfree webhook signature is invalid.');
  const payloadDigest=cashfreeWebhookPayloadDigest(req.rawBody);const receipt=await CashfreeWebhookReceipt.updateOne({payloadDigest},{$setOnInsert:{mode:'live',state:'PENDING_PROCESSING'}},{upsert:true});
  res.status(501).json({error:'LIVE_INTEGRATION_PENDING',duplicate:receipt.upsertedCount===0,message:'Signature accepted and a payload digest recorded; event processing remains disabled until live integration is configured.'});
}));

export default router;
export {adminRouter,webhookRouter};
