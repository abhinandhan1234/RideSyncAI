import rateLimit from 'express-rate-limit';
import {searchPlaces,reversePlace} from '../services/geocoding.js';
import { ai } from '../services/ps2/client.js';
import { intelligence,hour,bad,vehicleName } from '../services/ps2/intelligence.js';
import { joinPool } from '../services/ps2/pooling.js';
import {Router} from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import {User,Driver,Ride,RideOffer,RideEvent,Zone} from '../models/index.js';
import {distanceKm} from '../services/matching/rank.js';
import {dispatch,release,record,expireOffers} from '../services/matching/dispatch.js';
const router=Router();
router.param('id',(req,_res,next,id)=>{req.params.rideId=id;next();});
const fail=(status,error,message)=>Object.assign(new Error(message),{status,error});
const run=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
const valid=p=>p?.type==='Point'&&Array.isArray(p.coordinates)&&p.coordinates.length===2&&p.coordinates.every(Number.isFinite)&&Math.abs(p.coordinates[0])<=180&&Math.abs(p.coordinates[1])<=90;
const secret=()=>{if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32)throw fail(500,'CONFIGURATION_ERROR','JWT_SECRET must contain at least 32 characters');return process.env.JWT_SECRET;};
function auth(req,res,next){try{const token=/^Bearer (.+)$/i.exec(req.headers.authorization||'')?.[1];req.user=jwt.verify(token,secret());next();}catch{next(fail(401,'UNAUTHORIZED','Valid Bearer token required'));}}
const role=expected=>(req,res,next)=>req.user.role===expected?next():next(fail(403,'FORBIDDEN','Role is not authorized'));
const driverFor=async userId=>Driver.findOne({userId});
const event=async(ride,type,user)=>record(ride._id,type,{actorUserId:String(user?.sub||'')});
function emit(req,ride,type) {
 const rooms=['user:'+ride.passengerId];
 if(ride.poolMember) rooms.push('user:'+ride.poolMember);
 req.app.get('io')?.to(rooms).emit(type,{rideId:ride.id,status:ride.status});
}
async function canonicalZone(query) {
 const supplied=query.zoneId??query.zoneCode;
 if(supplied===undefined) return null;
 const zone=await Zone.findOne(mongoose.isValidObjectId(supplied)?{_id:supplied,code:/^Z0[1-8]$/}:{code:/^Z0[1-8]$/.test(supplied)?supplied:'INVALID'}).lean();
 if(!zone) throw bad('Unknown canonical zone');
 return zone;
}
router.get('/predictions/demand',auth,role('ADMIN'),run(async(req,res)=>{
 const zone=await canonicalZone(req.query),from=hour(req.query.from);
 const hours=req.query.to===undefined?6:(Date.parse(hour(req.query.to))-Date.parse(from))/3600000;
 if(hours<1||hours>24) throw bad('Expected 1 to 24 hours');
 const rows=await ai('forecast',{hour:from,hours});
 res.json({predictions:rows.filter(r=>!zone||zone.code===r.zone).map(r=>({zoneCode:r.zone,slotStart:r.hour,
 slotEnd:new Date(Date.parse(r.hour)+3600000),predictedCount:r.demand,modelVersion:'canonical-v1',source:r.source}))});
}));
router.get('/predictions/history',auth,role('ADMIN'),run(async(req,res)=>{
 const zone=await canonicalZone(req.query);if(!zone) throw bad('Specify zoneId or zoneCode');
 res.json({zoneCode:zone.code,timezone:'Asia/Kolkata',source:'SYNTHETIC_HOLDOUT',history:await ai('history',{zone:zone.code})});
}));
router.get('/zones/surge',auth,run(async(req,res)=>res.json(await intelligence(hour(req.query.from)))));
router.get('/routes/compare',auth,role('PASSENGER'),run(async(req,res)=>{
 const q=req.query,origin=[Number(q.originLng),Number(q.originLat)],destination=[Number(q.destLng),Number(q.destLat)];
 if(![origin,destination].every(coordinates=>valid({type:'Point',coordinates}))) throw bad('Invalid route endpoints');
 res.json({routes:await ai('routes',{origin,destination,vehicle:vehicleName(q.vehicleType||'auto')})});
}));
const locationSearchLimit=rateLimit({windowMs:60_000,limit:30,standardHeaders:true,legacyHeaders:false,message:{error:'RATE_LIMITED',message:'Too many location searches. Please wait a moment.'}});
router.get('/locations/search',locationSearchLimit,run(async(req,res)=>{const q=String(req.query.q||'').trim();if(q.length<3||q.length>120)throw fail(400,'INVALID_QUERY','Search query must contain 3–120 characters');try{res.json({suggestions:await searchPlaces(q)});}catch{throw fail(503,'GEOCODER_UNAVAILABLE','Location search is temporarily unavailable. Try again shortly.');}}));
router.get('/locations/reverse',locationSearchLimit,run(async(req,res)=>{const latitude=Number(req.query.lat),longitude=Number(req.query.lon);if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)throw fail(400,'INVALID_COORDINATES','Valid lat and lon are required');try{res.json({location:await reversePlace(latitude,longitude)});}catch(error){if(error instanceof TypeError)throw fail(400,'INVALID_COORDINATES',error.message);throw fail(503,'GEOCODER_UNAVAILABLE','Address lookup is temporarily unavailable.');}}));
router.patch('/drivers/location',auth,role('DRIVER'),run(async(req,res)=>{const latitude=Number(req.body.latitude),longitude=Number(req.body.longitude);if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)throw fail(400,'INVALID_COORDINATES','Valid latitude and longitude are required');const now=new Date();const driver=await Driver.findOneAndUpdate({userId:req.user.sub,zoneCode:/^Z0[1-8]$/},{$set:{location:{type:'Point',coordinates:[longitude,latitude]},locationSource:'GPS',lastLocationAt:now}},{new:true});if(!driver)throw fail(404,'NOT_FOUND','Driver profile not found');if(driver.activeRideId){const ride=await Ride.findOne({_id:driver.activeRideId,driverId:driver._id,source:'LIVE'});if(ride)emit(req,ride,'ride:location');}res.json({driverId:driver.id,location:driver.location,updatedAt:now});}));
router.get('/auth/me',auth,run(async(req,res)=>{
 const user=await User.findById(req.user.sub);
 if(!user||user.role!==req.user.role) throw fail(401,'UNAUTHORIZED','Sign in again');
 res.json({user:{_id:user.id,name:user.displayName,email:user.email,role:user.role.toLowerCase()}});
}));
router.get('/driver/history',auth,role('DRIVER'),run(async(req,res)=>{
 const driver=await driverFor(req.user.sub);
 res.json({rides:driver?await Ride.find({driverId:driver.id,source:'LIVE'}).sort({requestedAt:-1}).limit(50).lean():[]});
}));
router.post('/auth/register',run(async(req,res)=>{const {name,email,password,phone,role:requestedRole}=req.body;if(requestedRole&&requestedRole.toLowerCase()!=='passenger')throw fail(403,'FORBIDDEN','Driver accounts require administrator provisioning');if(typeof name!=='string'||name.trim().length<2||typeof email!=='string'||typeof password!=='string'||password.length<8)throw fail(400,'VALIDATION_ERROR','Name, email and password are required');const user=await User.create({displayName:name.trim(),email:email.toLowerCase(),phone,passwordHash:await bcrypt.hash(password,12),role:'PASSENGER',isSynthetic:false});const accessToken=jwt.sign({sub:user.id,role:user.role},secret(),{expiresIn:'8h'});res.status(201).json({accessToken,user:{_id:user.id,name:user.displayName,email:user.email,role:'passenger'}});}));
router.post('/auth/login',run(async(req,res)=>{const user=await User.findOne({email:String(req.body.email||'').toLowerCase()}).select('+passwordHash');if(!user||!await bcrypt.compare(String(req.body.password||''),user.passwordHash))throw fail(401,'INVALID_CREDENTIALS','Invalid email or password');const accessToken=jwt.sign({sub:user.id,role:user.role},secret(),{expiresIn:'8h'});res.json({accessToken,user:{_id:user.id,name:user.displayName,email:user.email,role:user.role.toLowerCase()}});}));
router.get('/drivers/nearby',auth,role('PASSENGER'),run(async(req,res)=>{const lng=Number(req.query.lng),lat=Number(req.query.lat),radius=Number(req.query.radiusKm||3);if(!Number.isFinite(lng)||!Number.isFinite(lat)||Math.abs(lng)>180||Math.abs(lat)>90||!Number.isFinite(radius)||radius<=0||radius>20)throw fail(400,'INVALID_COORDINATES','Valid lng, lat and radiusKm required');const drivers=await Driver.find({zoneCode:/^Z0[1-8]$/,status:'AVAILABLE',activeRideId:null,'vehicle.capacity':{$gte:Number(req.query.passengerCount||1)},...(req.query.vehicleType?{'vehicle.type':String(req.query.vehicleType).toUpperCase()}:{}),location:{$near:{$geometry:{type:'Point',coordinates:[lng,lat]},$maxDistance:radius*1000}}}).limit(40).lean();res.json({count:drivers.length,drivers:drivers.map(d=>{const km=distanceKm([lng,lat],d.location.coordinates);return {driverId:d._id,vehicleType:d.vehicle?.type?.toLowerCase(),distanceKm:+km.toFixed(2),etaMinutes:Math.ceil(km/0.35),location:d.location};})});}));
router.patch('/drivers/availability',auth,role('DRIVER'),run(async(req,res)=>{if(typeof req.body.available!=='boolean')throw fail(400,'VALIDATION_ERROR','available must be boolean');const driver=await Driver.findOneAndUpdate({userId:req.user.sub,zoneCode:/^Z0[1-8]$/,activeRideId:null,status:{$in:['AVAILABLE','OFFLINE']}},{$set:{status:req.body.available?'AVAILABLE':'OFFLINE',lastLocationAt:new Date(),idleSince:new Date()}},{new:true});if(!driver)throw fail(409,'DRIVER_BUSY','Driver cannot change availability');res.json({driverId:driver.id,available:driver.status==='AVAILABLE',updatedAt:driver.updatedAt});}));
router.post('/pools/quote',auth,role('PASSENGER'),run(async(req,res)=>{
 const {pickup,dropoff,passengerCount=1,vehicleType='car'}=req.body;
 if(!valid(pickup)||!valid(dropoff)||!Number.isInteger(passengerCount)||passengerCount<1||passengerCount>4) throw bad('Invalid quote request');
 const quote=await joinPool({quote:true,passengerId:req.user.sub,pickup,dropoff,passengerCount,type:vehicleName(vehicleType)==='cab'?'CAR':String(vehicleType).toUpperCase()});
 res.json(quote||{feasible:false});
}));
router.post('/rides',auth,role('PASSENGER'),run(async(req,res)=>{const {pickup,dropoff,routeType,passengerCount=1,vehicleType='car'}=req.body;if(!valid(pickup)||!valid(dropoff)||!['fastest','shortest','eco'].includes(routeType)||!Number.isInteger(passengerCount)||passengerCount<1||passengerCount>4)throw fail(400,'VALIDATION_ERROR','Invalid coordinates, routeType or passengerCount');const active=await Ride.exists({$or:[{passengerId:req.user.sub},{poolMember:req.user.sub}],source:'LIVE',status:{$in:['REQUESTED','OFFERED','REASSIGNING','ACCEPTED','ARRIVING','ONGOING']}});if(active)throw fail(409,'ACTIVE_RIDE','Passenger already has an active ride');const zone=await Zone.findOne({code:/^Z0[1-8]$/,center:{$near:{$geometry:pickup,$maxDistance:5000}}}).lean();if(!zone)throw fail(400,'OUTSIDE_SERVICE_AREA','Pickup must be in a canonical zone');const type=vehicleName(vehicleType)==='cab'?'CAR':String(vehicleType).toUpperCase();
const mode=req.body.bookingMode??(req.body.poolingOptIn===true?'POOLING':'INDIVIDUAL');
if(!['INDIVIDUAL','POOLING'].includes(mode)||(req.body.poolingOptIn!==undefined&&req.body.poolingOptIn!==(mode==='POOLING')))throw bad('Conflicting booking mode');
if(mode==='POOLING'){
 const pooled=await joinPool({passengerId:req.user.sub,pickup,dropoff,passengerCount,type,target:req.body.poolRideId,io:req.app.get('io')});
 if(pooled)return res.status(202).json({...pooled,bookingMode:mode});
 if(req.body.poolRideId)throw fail(409,'POOL_CHANGED','Pool no longer available');
}
const routes=await ai('routes',{origin:pickup.coordinates,destination:dropoff.coordinates,vehicle:vehicleName(type)});
const selected=routes[routeType];
let surge=1, pricingSource='FORECAST';
try {const zones=await intelligence(hour(),{'vehicle.type':type,'vehicle.capacity':{$gte:passengerCount}});
 surge=zones.zones.find(row=>row.zone===zone.code).surge;
} catch { pricingSource='DEFAULT'; }
const distance=selected.distanceKm,estimatedDurationMin=Math.ceil(selected.etaMinutes);
const fareEstimate=+((40+distance*12+estimatedDurationMin*2)*surge).toFixed(2);
const ride=await Ride.create({passengerId:req.user.sub,pickup,dropoff,pickupZoneCode:zone.code,passengerCount,requestedVehicleType:type,routeType,poolingRequested:mode==='POOLING',status:'REQUESTED',source:'LIVE',metadata:{estimateSource:selected.source,pricingSource},attemptCount:0,distanceKm:distance,estimatedDurationMin,fare:{total:fareEstimate,currency:'INR',surge},requestedAt:new Date()});await event(ride,'REQUESTED',req.user);const response={bookingMode:mode,rideId:ride.id,status:'REQUESTED',fareEstimate,surgeMultiplier:surge,pricingSource,routeSource:selected.source,estimatedDistanceKm:+distance.toFixed(2),estimatedDurationMin,estimatedFuelL:selected.estimatedFuelL,createdAt:ride.createdAt};res.status(202).json(response);void dispatch(ride._id,req.app.get('io')).catch(error=>console.error('Dispatch failed',error));}));
router.post('/pools/find',auth,role('PASSENGER'),run(async(req,res)=>{
 const ride=await Ride.findOne({_id:req.body.rideId,$or:[{passengerId:req.user.sub},{poolMember:req.user.sub}]});
 if(!ride?.poolPlan) throw fail(404,'NO_POOL','No booked pool for this ride');
 res.json({rideId:ride.id,poolId:ride.id,status:ride.status,...ride.poolPlan});
}));
router.get('/rides/history',auth,role('PASSENGER'),run(async(req,res)=>res.json({rides:await Ride.find({$or:[{passengerId:req.user.sub},{poolMember:req.user.sub}],source:'LIVE'}).sort({requestedAt:-1}).limit(50).lean()})));
router.get('/rides/:rideId',auth,run(async(req,res)=>{if(!mongoose.isValidObjectId(req.params.rideId))throw fail(400,'INVALID_ID','Invalid ride ID');const ride=await Ride.findById(req.params.rideId);if(!ride)throw fail(404,'NOT_FOUND','Ride not found');const driver=ride.driverId&&await driverFor(req.user.sub);if(String(ride.passengerId)!==req.user.sub&&String(ride.poolMember)!==req.user.sub&&(!driver||String(driver._id)!==String(ride.driverId)))throw fail(403,'FORBIDDEN','Ride access denied');const assigned=ride.driverId&&await Driver.findById(ride.driverId).select('location locationSource');res.json({driver:assigned?.locationSource==='GPS'?{location:assigned.location}:null,rideId:ride.id,status:ride.status,driverId:ride.driverId,pickup:ride.pickup,dropoff:ride.dropoff,pickupEtaMin:ride.pickupEtaMin,pool:ride.poolPlan,selection:ride.metadata?.selection,fareEstimate:ride.poolPlan?.fares[String(ride.poolMember)===req.user.sub?1:0]??ride.fare?.total,createdAt:ride.createdAt});}));
router.get('/driver/offers',auth,role('DRIVER'),run(async(req,res)=>{const driver=await driverFor(req.user.sub);if(!driver)throw fail(404,'NOT_FOUND','Driver profile not found');res.json({offers:await RideOffer.find({driverId:driver._id,status:'PENDING',expiresAt:{$gt:new Date()}}).lean()});}));
const respond=run(async(req,res)=>{const offer=await RideOffer.findById(req.params.offerId);if(!offer||req.params.rideId&&String(offer.rideId)!==req.params.rideId)throw fail(404,'NOT_FOUND','Offer not found');const driver=await driverFor(req.user.sub);if(String(offer.driverId)!==String(driver?._id))throw fail(403,'FORBIDDEN','Offer belongs to another driver');const action=req.body.action;if(!['accept','reject'].includes(action))throw fail(400,'VALIDATION_ERROR','action must be accept or reject');if(offer.expiresAt<=new Date()){await expireOffers(req.app.get('io'));throw fail(409,'OFFER_EXPIRED','Offer expired');}const changed=await RideOffer.findOneAndUpdate({_id:offer._id,status:'PENDING',expiresAt:{$gt:new Date()}},{$set:{status:action==='accept'?'ACCEPTED':'REJECTED',respondedAt:new Date()}},{new:true});if(!changed)throw fail(409,'OFFER_CLOSED','Offer already answered');if(action==='accept'){const ride=await Ride.findOneAndUpdate({_id:offer.rideId,status:'OFFERED',activeOfferId:offer._id,driverId:driver._id},{$set:{status:'ACCEPTED',acceptedAt:new Date(),arrivalDeadline:new Date(Date.now()+60000*(offer.estimatedPickupMin+Number(process.env.ARRIVAL_GRACE_MINUTES||5)))}},{new:true});if(!ride){await release(driver._id,offer.rideId);throw fail(409,'RIDE_CHANGED','Ride state changed');}await Driver.updateOne({_id:driver._id,activeRideId:ride._id,status:'RESERVED'},{$set:{status:'BUSY',currentWorkload:1},$inc:{acceptedOffers:1}});await event(ride,'ACCEPTED',req.user);emit(req,ride,'ride:accepted');if(ride.poolMember)emit(req,ride,'POOL_DRIVER_ASSIGNED');return res.json({rideId:ride.id,offerId:offer.id,status:'ACCEPTED',pool:ride.poolPlan,pickupNavigation:{waypoints:[driver.location.coordinates,ride.pickup.coordinates],distanceKm:offer.distanceKm,etaMinutes:offer.estimatedPickupMin}});}const ride=await Ride.findOneAndUpdate({_id:offer.rideId,status:'OFFERED',activeOfferId:offer._id},{$set:{status:'REASSIGNING',driverId:null,activeOfferId:null}},{new:true});await release(driver._id,offer.rideId);if(ride){await event(ride,'REJECTED',req.user);emit(req,ride,'ride:rejected');void dispatch(ride._id,req.app.get('io')).catch(console.error);}res.json({rideId:String(offer.rideId),offerId:offer.id,status:'REJECTED'});});
router.post('/offers/:offerId/respond',auth,role('DRIVER'),respond);
router.post('/rides/:id/offers/:offerId/respond',auth,role('DRIVER'),respond);
router.patch('/rides/:rideId/status',auth,role('DRIVER'),run(async(req,res)=>{const previous={ARRIVING:'ACCEPTED',ONGOING:'ARRIVING',COMPLETED:'ONGOING'}[req.body.status];if(!previous)throw fail(400,'INVALID_STATUS','Invalid status transition');const driver=await driverFor(req.user.sub);const now=new Date(),field={ARRIVING:'arrivedAt',ONGOING:'startedAt',COMPLETED:'completedAt'}[req.body.status];const ride=await Ride.findOneAndUpdate({_id:req.params.rideId,driverId:driver?._id,status:previous,source:'LIVE',...(req.body.status==='ARRIVING'?{}:{poolMember:null})},{$set:{status:req.body.status,[field]:now}},{new:true});if(!ride)throw fail(409,'INVALID_TRANSITION','Ride or driver state changed');if(ride.status==='COMPLETED'){await Driver.updateOne({_id:driver._id,activeRideId:ride._id},{$set:{status:'AVAILABLE',activeRideId:null,idleSince:now,currentWorkload:0},$inc:{completedRides:1}});}await event(ride,ride.status,req.user);emit(req,ride,'ride:status');if(ride.poolMember)emit(req,ride,'POOL_PICKUP_ARRIVING');res.json({rideId:ride.id,previousStatus:previous,newStatus:ride.status,updatedAt:ride.updatedAt,finalFare:ride.status==='COMPLETED'?ride.fare?.total:undefined});}));
router.post('/rides/:rideId/stops/:index',auth,role('DRIVER'),run(async(req,res)=>{
 const driver=await driverFor(req.user.sub),index=Number(req.params.index);
 const ride=await Ride.findOne({_id:req.params.rideId,driverId:driver?._id,poolMember:{$ne:null},status:{$in:['ARRIVING','ONGOING']}});
 if(!ride||!Number.isInteger(index)||ride.poolPlan.stopIndex!==index||index>=4)throw fail(409,'INVALID_STOP','Stop changed');
 const stop=ride.poolPlan.pooled.order[index],at=new Date();
 const changes={status:index===3?'COMPLETED':'ONGOING',[`poolPlan.progress.${stop}`]:at};
 if(index===0)changes.startedAt=at;
 if(index===3)changes.completedAt=at;
 const updated=await Ride.findOneAndUpdate({_id:ride.id,driverId:driver._id,status:ride.status,'poolPlan.stopIndex':index},
   {$set:changes,$inc:{'poolPlan.stopIndex':1}},{new:true});
 if(!updated)throw fail(409,'INVALID_STOP','Stop changed');
 if(index===3)await Driver.updateOne({_id:driver._id,activeRideId:ride._id},{$set:{activeRideId:null,status:'AVAILABLE',idleSince:at,currentWorkload:0},$inc:{completedRides:1}});
 const owner=stop.endsWith('1')?ride.passengerId:ride.poolMember;
 req.app.get('io')?.to('user:'+owner).emit(stop.startsWith('drop')?'POOL_PASSENGER_DROPPED_OFF':'POOL_PASSENGER_PICKED_UP',{rideId:ride.id,stop});
 emit(req,updated,index===3?'POOL_COMPLETED':'POOL_ROUTE_UPDATED');
 await event(updated,stop,req.user);
 res.json({rideId:ride.id,stop,status:updated.status});
}));
router.post('/rides/:rideId/cancel',auth,role('PASSENGER'),run(async(req,res)=>{const shared=await Ride.findOne({_id:req.params.rideId,poolMember:{$ne:null},$or:[{passengerId:req.user.sub},{poolMember:req.user.sub}]});
if(shared){
 if(!['OFFERED','ACCEPTED','ARRIVING','REASSIGNING'].includes(shared.status))throw fail(409,'POOL_IN_PROGRESS','Cannot withdraw after boarding starts');
 const leaving=String(shared.passengerId)===req.user.sub?0:1,remaining=1-leaving;
 const owner=remaining===0?shared.passengerId:shared.poolMember,party=shared.poolPlan.requests[remaining];
 const kept=await Ride.findOneAndUpdate({_id:shared.id,status:shared.status,poolMember:shared.poolMember,driverId:shared.driverId},
 {$set:{passengerId:owner,poolMember:null,poolPlan:null,poolingRequested:false,passengerCount:party.seats,
 pickup:{type:'Point',coordinates:party.pickup},dropoff:{type:'Point',coordinates:party.dropoff},'fare.total':shared.poolPlan.fares[remaining]}},{new:true});
 if(!kept)throw fail(409,'POOL_CHANGED','Refresh the ride');
 req.app.get('io')?.in('user:'+req.user.sub).socketsLeave('ride:'+shared.id);
 req.app.get('io')?.to('user:'+req.user.sub).emit('POOL_CANCELLED',{rideId:shared.id});
 emit(req,kept,'POOL_ROUTE_UPDATED');
 return res.json({rideId:shared.id,status:'WITHDRAWN',remainingRideStatus:kept.status});
}
const ride=await Ride.findOneAndUpdate({_id:req.params.rideId,$or:[{passengerId:req.user.sub},{poolMember:req.user.sub}],source:'LIVE',poolMember:null,status:{$in:['REQUESTED','OFFERED','ACCEPTED','ARRIVING','REASSIGNING']}},{$set:{status:'CANCELLED',cancelledAt:new Date()}},{new:true});if(!ride)throw fail(409,'INVALID_TRANSITION','Ride cannot be cancelled');if(ride.activeOfferId)await RideOffer.updateOne({_id:ride.activeOfferId,status:'PENDING'},{$set:{status:'CANCELLED'}});if(ride.driverId)await release(ride.driverId,ride._id);await event(ride,'CANCELLED',req.user);emit(req,ride,'ride:status');res.json({rideId:ride.id,status:'CANCELLED'});}));
export default router;
