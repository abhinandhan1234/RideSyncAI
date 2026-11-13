import {Router} from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import {User,Driver,Ride,RideOffer,RideEvent,Zone,DriverApplication} from '../models/index.js';
import {distanceKm} from '../services/matching/rank.js';
import {dispatch,release,record,expireOffers} from '../services/matching/dispatch.js';
import rateLimit from 'express-rate-limit';
import {searchPlaces,reversePlace} from '../services/geocoding.js';
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
const emit=(req,ride,type)=>req.app.get('io')?.to(`ride:${ride._id}`).emit(type,{rideId:ride.id,status:ride.status});
const productionDriverEligible=driver=>driver?.approvalStatus==='APPROVED'&&driver.verification?.aadhaar?.status==='VERIFIED'&&driver.verification?.aadhaar?.provider==='CASHFREE'&&driver.verification?.aadhaar?.mode==='live'&&driver.verification?.drivingLicense?.status==='VERIFIED'&&driver.verification?.drivingLicense?.provider==='CASHFREE'&&driver.verification?.drivingLicense?.mode==='live';
const locationSearchLimit=rateLimit({windowMs:60_000,limit:30,standardHeaders:true,legacyHeaders:false,message:{error:'RATE_LIMITED',message:'Too many location searches. Please wait a moment.'}});
router.get('/locations/search',locationSearchLimit,run(async(req,res)=>{const q=String(req.query.q||'').trim();if(q.length<3||q.length>120)throw fail(400,'INVALID_QUERY','Search query must contain 3–120 characters');try{res.json({suggestions:await searchPlaces(q)});}catch{throw fail(503,'GEOCODER_UNAVAILABLE','Location search is temporarily unavailable. Try again shortly.');}}));
router.get('/locations/reverse',locationSearchLimit,run(async(req,res)=>{const latitude=Number(req.query.lat),longitude=Number(req.query.lon);if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)throw fail(400,'INVALID_COORDINATES','Valid lat and lon are required');try{res.json({location:await reversePlace(latitude,longitude)});}catch(error){if(error instanceof TypeError)throw fail(400,'INVALID_COORDINATES',error.message);throw fail(503,'GEOCODER_UNAVAILABLE','Address lookup is temporarily unavailable.');}}));
router.post('/auth/register',run(async(req,res)=>{const {name,email,password,phone,role:requestedRole}=req.body;if(requestedRole&&requestedRole.toLowerCase()!=='passenger')throw fail(403,'FORBIDDEN','Driver accounts require administrator provisioning');if(typeof name!=='string'||name.trim().length<2||typeof email!=='string'||typeof password!=='string'||password.length<8)throw fail(400,'VALIDATION_ERROR','Name, email and password are required');const user=await User.create({displayName:name.trim(),email:email.toLowerCase(),phone,passwordHash:await bcrypt.hash(password,12),role:'PASSENGER',isSynthetic:false});const accessToken=jwt.sign({sub:user.id,role:user.role},secret(),{expiresIn:'8h'});res.status(201).json({accessToken,user:{_id:user.id,name:user.displayName,email:user.email,role:'passenger'}});}));
router.post('/auth/login',run(async(req,res)=>{const user=await User.findOne({email:String(req.body.email||'').toLowerCase()}).select('+passwordHash');if(!user||!await bcrypt.compare(String(req.body.password||''),user.passwordHash))throw fail(401,'INVALID_CREDENTIALS','Invalid email or password');const accessToken=jwt.sign({sub:user.id,role:user.role},secret(),{expiresIn:'8h'});res.json({accessToken,user:{_id:user.id,name:user.displayName,email:user.email,role:user.role.toLowerCase()}});}));
router.get('/drivers/nearby',auth,role('PASSENGER'),run(async(req,res)=>{const lng=Number(req.query.lng),lat=Number(req.query.lat),radius=Number(req.query.radiusKm||3);if(!Number.isFinite(lng)||!Number.isFinite(lat)||Math.abs(lng)>180||Math.abs(lat)>90||!Number.isFinite(radius)||radius<=0||radius>20)throw fail(400,'INVALID_COORDINATES','Valid lng, lat and radiusKm required');const drivers=await Driver.find({zoneCode:/^Z0[1-8]$/,status:'AVAILABLE',activeRideId:null,'vehicle.capacity':{$gte:Number(req.query.passengerCount||1)},...(req.query.vehicleType?{'vehicle.type':String(req.query.vehicleType).toUpperCase()}:{}),location:{$near:{$geometry:{type:'Point',coordinates:[lng,lat]},$maxDistance:radius*1000}}}).limit(40).lean();res.json({count:drivers.length,drivers:drivers.map(d=>{const km=distanceKm([lng,lat],d.location.coordinates);return {driverId:d._id,vehicleType:d.vehicle?.type?.toLowerCase(),distanceKm:+km.toFixed(2),etaMinutes:Math.ceil(km/0.35),location:d.location};})});}));
router.patch('/drivers/availability',auth,role('DRIVER'),run(async(req,res)=>{if(typeof req.body.available!=='boolean')throw fail(400,'VALIDATION_ERROR','available must be boolean');const driver=await driverFor(req.user.sub);if(!driver||driver.activeRideId||!/^Z0[1-8]$/.test(driver.zoneCode||''))throw fail(409,'DRIVER_BUSY','Driver cannot change availability');if(req.body.available&&process.env.NODE_ENV==='production'&&(!['APPROVED'].includes(driver.approvalStatus)||driver.verification?.aadhaar?.status!=='VERIFIED'||driver.verification?.aadhaar?.provider!=='CASHFREE'||driver.verification?.aadhaar?.mode!=='live'||driver.verification?.drivingLicense?.status!=='VERIFIED'||driver.verification?.drivingLicense?.provider!=='CASHFREE'||driver.verification?.drivingLicense?.mode!=='live'))throw fail(403,'VERIFICATION_REQUIRED','Production availability requires approved status and live Aadhaar and Driving Licence verification.');driver.status=req.body.available?'AVAILABLE':'OFFLINE';driver.lastLocationAt=new Date();driver.idleSince=new Date();await driver.save();res.json({driverId:driver.id,available:driver.status==='AVAILABLE',updatedAt:driver.updatedAt});}));
router.patch('/drivers/location',auth,role('DRIVER'),run(async(req,res)=>{const latitude=Number(req.body.latitude),longitude=Number(req.body.longitude);if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)throw fail(400,'INVALID_COORDINATES','Valid latitude and longitude are required');const now=new Date();const driver=await Driver.findOneAndUpdate({userId:req.user.sub,zoneCode:/^Z0[1-8]$/},{$set:{location:{type:'Point',coordinates:[longitude,latitude]},locationSource:'GPS',lastLocationAt:now}},{new:true});if(!driver)throw fail(404,'NOT_FOUND','Driver profile not found');if(driver.activeRideId){const ride=await Ride.findOne({_id:driver.activeRideId,driverId:driver._id,source:'LIVE'});if(ride)emit(req,ride,'ride:location');}res.json({driverId:driver.id,location:driver.location,updatedAt:now});}));
router.post('/rides',auth,role('PASSENGER'),run(async(req,res)=>{const {pickup,dropoff,routeType,passengerCount=1,vehicleType='car'}=req.body;if(!valid(pickup)||!valid(dropoff)||!['fastest','shortest','eco'].includes(routeType)||!Number.isInteger(passengerCount)||passengerCount<1||passengerCount>4)throw fail(400,'VALIDATION_ERROR','Invalid coordinates, routeType or passengerCount');const pickupAddress=String(req.body.pickupAddress||'').trim().slice(0,200),dropoffAddress=String(req.body.dropoffAddress||'').trim().slice(0,200);if(!pickupAddress||!dropoffAddress)throw fail(400,'VALIDATION_ERROR','Selected pickup and drop-off names are required');const active=await Ride.exists({passengerId:req.user.sub,source:'LIVE',status:{$in:['REQUESTED','OFFERED','REASSIGNING','ACCEPTED','ARRIVING','ARRIVED','ONGOING']}});if(active)throw fail(409,'ACTIVE_RIDE','Passenger already has an active ride');const zone=await Zone.findOne({code:/^Z0[1-8]$/,center:{$near:{$geometry:pickup,$maxDistance:5000}}}).lean();if(!zone)throw fail(400,'OUTSIDE_SERVICE_AREA','Pickup must be in a canonical zone');const distance=distanceKm(pickup.coordinates,dropoff.coordinates)*1.3,estimatedDurationMin=Math.ceil(distance/0.35),fareEstimate=+(40+distance*12+estimatedDurationMin*2).toFixed(2);const ride=await Ride.create({passengerId:req.user.sub,pickup,dropoff,pickupAddress,dropoffAddress,pickupZoneCode:zone.code,passengerCount,requestedVehicleType:String(vehicleType).toUpperCase(),routeType,poolingRequested:Boolean(req.body.poolingOptIn),status:'REQUESTED',source:'LIVE',metadata:{estimateSource:'SYNTHETIC_BASELINE'},attemptCount:0,distanceKm:distance,estimatedDurationMin,fare:{total:fareEstimate,currency:'INR',surge:1},requestedAt:new Date()});await event(ride,'REQUESTED',req.user);const response={rideId:ride.id,status:'REQUESTED',fareEstimate,surgeMultiplier:1,estimatedDistanceKm:+distance.toFixed(2),estimatedDurationMin,estimatedFuelL:null,createdAt:ride.createdAt};res.status(202).json(response);void dispatch(ride._id,req.app.get('io')).catch(error=>console.error('Dispatch failed',error));}));
router.get('/rides/history',auth,role('PASSENGER'),run(async(req,res)=>res.json({rides:await Ride.find({passengerId:req.user.sub,source:'LIVE'}).sort({requestedAt:-1}).limit(50).lean()})));
router.get('/rides/:rideId',auth,run(async(req,res)=>{if(!mongoose.isValidObjectId(req.params.rideId))throw fail(400,'INVALID_ID','Invalid ride ID');const ride=await Ride.findById(req.params.rideId).lean();if(!ride)throw fail(404,'NOT_FOUND','Ride not found');const driver=ride.driverId?await Driver.findById(ride.driverId).lean():null;if(String(ride.passengerId)!==req.user.sub&&String(driver?.userId)!==req.user.sub)throw fail(403,'FORBIDDEN','Ride access denied');const driverUser=driver?.userId?await User.findById(driver.userId).select('displayName isSynthetic').lean():null;res.json({rideId:String(ride._id),status:ride.status,driverId:ride.driverId?String(ride.driverId):null,pickup:ride.pickup,pickupAddress:ride.pickupAddress,dropoff:ride.dropoff,dropoffAddress:ride.dropoffAddress,passengerCount:ride.passengerCount,routeType:ride.routeType,pickupEtaMin:ride.pickupEtaMin,fareEstimate:ride.fare?.total,distanceKm:ride.distanceKm,estimatedDurationMin:ride.estimatedDurationMin,createdAt:ride.createdAt,cancelledAt:ride.cancelledAt,cancellationReason:ride.cancellationReason,driver:driver?{name:driverUser?.displayName||'RideSync driver',vehicleType:driver.vehicle?.type||'Vehicle',vehicleModel:driver.vehicle?.model||'',registrationNumber:driver.vehicle?.plate||'',rating:driver.rating??null,location:driver.location,locationSource:driver.locationSource||(driverUser?.isSynthetic?'SYNTHETIC':'STORED'),lastLocationAt:driver.lastLocationAt||null}:null});}));
router.get('/driver/offers',auth,role('DRIVER'),run(async(req,res)=>{const driver=await driverFor(req.user.sub);if(!driver)throw fail(404,'NOT_FOUND','Driver profile not found');if(process.env.NODE_ENV==='production'&&!productionDriverEligible(driver))throw fail(403,'VERIFICATION_REQUIRED','Production ride offers require admin approval and live Cashfree verification.');res.json({offers:await RideOffer.find({driverId:driver._id,status:'PENDING',expiresAt:{$gt:new Date()}}).lean()});}));
const respond=run(async(req,res)=>{const offer=await RideOffer.findById(req.params.offerId);if(!offer||req.params.rideId&&String(offer.rideId)!==req.params.rideId)throw fail(404,'NOT_FOUND','Offer not found');const driver=await driverFor(req.user.sub);if(String(offer.driverId)!==String(driver?._id))throw fail(403,'FORBIDDEN','Offer belongs to another driver');if(process.env.NODE_ENV==='production'&&!productionDriverEligible(driver))throw fail(403,'VERIFICATION_REQUIRED','Production ride offers require admin approval and live Cashfree verification.');const action=req.body.action;if(!['accept','reject'].includes(action))throw fail(400,'VALIDATION_ERROR','action must be accept or reject');if(offer.expiresAt<=new Date()){await expireOffers(req.app.get('io'));throw fail(409,'OFFER_EXPIRED','Offer expired');}const changed=await RideOffer.findOneAndUpdate({_id:offer._id,status:'PENDING',expiresAt:{$gt:new Date()}},{$set:{status:action==='accept'?'ACCEPTED':'REJECTED',respondedAt:new Date()}},{new:true});if(!changed)throw fail(409,'OFFER_CLOSED','Offer already answered');if(action==='accept'){const ride=await Ride.findOneAndUpdate({_id:offer.rideId,status:'OFFERED',activeOfferId:offer._id,driverId:driver._id},{$set:{status:'ACCEPTED',acceptedAt:new Date()}},{new:true});if(!ride){await release(driver._id,offer.rideId);throw fail(409,'RIDE_CHANGED','Ride state changed');}await Driver.updateOne({_id:driver._id,activeRideId:ride._id,status:'RESERVED'},{$set:{status:'BUSY',currentWorkload:1},$inc:{acceptedOffers:1}});await event(ride,'ACCEPTED',req.user);emit(req,ride,'ride:accepted');return res.json({rideId:ride.id,offerId:offer.id,status:'ACCEPTED',pickupNavigation:{waypoints:[driver.location.coordinates,ride.pickup.coordinates],distanceKm:offer.distanceKm,etaMinutes:offer.estimatedPickupMin}});}const ride=await Ride.findOneAndUpdate({_id:offer.rideId,status:'OFFERED',activeOfferId:offer._id},{$set:{status:'REASSIGNING',driverId:null,activeOfferId:null}},{new:true});await release(driver._id,offer.rideId);if(ride){await event(ride,'REJECTED',req.user);emit(req,ride,'ride:rejected');void dispatch(ride._id,req.app.get('io')).catch(console.error);}res.json({rideId:String(offer.rideId),offerId:offer.id,status:'REJECTED'});});
router.post('/offers/:offerId/respond',auth,role('DRIVER'),respond);
router.post('/rides/:id/offers/:offerId/respond',auth,role('DRIVER'),respond);
router.patch('/rides/:rideId/status',auth,role('DRIVER'),run(async(req,res)=>{const previous={ARRIVING:'ACCEPTED',ARRIVED:'ARRIVING',ONGOING:'ARRIVED',COMPLETED:'ONGOING'}[req.body.status];if(!previous)throw fail(400,'INVALID_STATUS','Invalid status transition');const driver=await driverFor(req.user.sub);const now=new Date(),field={ARRIVING:'driverHeadingAt',ARRIVED:'arrivedAt',ONGOING:'startedAt',COMPLETED:'completedAt'}[req.body.status];const ride=await Ride.findOneAndUpdate({_id:req.params.rideId,driverId:driver?._id,status:previous,source:'LIVE'},{$set:{status:req.body.status,[field]:now}},{new:true});if(!ride)throw fail(409,'INVALID_TRANSITION','Ride or driver state changed');if(ride.status==='ONGOING')await Driver.updateOne({_id:driver._id,activeRideId:ride._id},{$set:{status:'ON_TRIP'}});if(ride.status==='COMPLETED'){await Driver.updateOne({_id:driver._id,activeRideId:ride._id},{$set:{status:'AVAILABLE',activeRideId:null,idleSince:now,currentWorkload:0},$inc:{completedRides:1}});}await event(ride,ride.status,req.user);emit(req,ride,'ride:status');res.json({rideId:ride.id,previousStatus:previous,newStatus:ride.status,updatedAt:ride.updatedAt,finalFare:ride.status==='COMPLETED'?ride.fare?.total:undefined});}));
const cancelRide=run(async(req,res)=>{const allowed=['Changed my plans','Booked by mistake','Driver taking too long','Found another ride','Other'];const reason=String(req.body.reason||'').trim();if(reason&&!allowed.includes(reason))throw fail(400,'INVALID_REASON','Choose a listed cancellation reason');const ride=await Ride.findOneAndUpdate({_id:req.params.rideId,passengerId:req.user.sub,source:'LIVE',status:{$in:['REQUESTED','OFFERED','REASSIGNING','ACCEPTED','ARRIVING','ARRIVED']}},{$set:{status:'CANCELLED',cancelledAt:new Date(),cancellationReason:reason||null}},{new:true});if(!ride)throw fail(409,'INVALID_TRANSITION','Ride cannot be cancelled');if(ride.activeOfferId)await RideOffer.updateOne({_id:ride.activeOfferId,status:'PENDING'},{$set:{status:'CANCELLED',respondedAt:new Date()}});if(ride.driverId){const assigned=await Driver.findById(ride.driverId).select('userId').lean();await release(ride.driverId,ride._id);if(assigned?.userId)req.app.get('io')?.to(`user:${assigned.userId}`).emit('ride:cancelled',{rideId:ride.id,reason});}await event(ride,'CANCELLED',req.user);emit(req,ride,'ride:status');res.json({rideId:ride.id,status:'CANCELLED',cancelledAt:ride.cancelledAt,cancellationReason:ride.cancellationReason});});
router.patch('/rides/:rideId/cancel',auth,role('PASSENGER'),cancelRide);
router.post('/rides/:rideId/cancel',auth,role('PASSENGER'),cancelRide);

router.get('/admin/analytics',run(async(req,res)=>{
  const now=new Date();
  const startOfToday=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  let liveDrivers=await Driver.find({}).lean();
  let bookingDrivers=[];
  try{const BookingDriver=mongoose.models.BookingDriver;if(BookingDriver){bookingDrivers=await BookingDriver.find({}).lean();}}catch{}
  const allDrivers=[
    ...liveDrivers.map(d=>({id:d._id.toString(),driverId:d.externalId||d._id.toString(),name:d.name||`Driver ${d.externalId||''}`,status:(d.status||'AVAILABLE').toUpperCase(),vehicleType:d.vehicle?.type||'CAR',plate:d.vehicle?.plate||'KA-22',location:d.location?.coordinates||[74.4977,15.8497],zoneCode:d.zoneCode||'Z01',acceptanceRate:d.acceptanceRate||0.9})),
    ...bookingDrivers.map(d=>({id:d._id.toString(),driverId:d.driverId,name:d.name||`Driver ${d.driverId}`,status:(d.status||'available').toUpperCase(),vehicleType:d.vehicleType||d.vehicle?.type||'CAR',plate:d.vehicle?.plate||'KA-22',location:d.location?.coordinates||[74.4977,15.8497],zoneCode:d.zoneCode||'Z01',acceptanceRate:d.acceptanceRate||0.85}))
  ];
  const activeDrivers=allDrivers.filter(d=>['AVAILABLE','BUSY','RESERVED'].includes(d.status)).length;
  const availableDrivers=allDrivers.filter(d=>d.status==='AVAILABLE').length;
  const busyDrivers=allDrivers.filter(d=>['BUSY','RESERVED'].includes(d.status)).length;
  const liveRidesToday=await Ride.find({$or:[{requestedAt:{$gte:startOfToday}},{createdAt:{$gte:startOfToday}}]}).sort({createdAt:-1}).lean();
  let bookingRidesToday=[];
  try{const BookingRide=mongoose.models.BookingRide;if(BookingRide){bookingRidesToday=await BookingRide.find({createdAt:{$gte:startOfToday}}).sort({createdAt:-1}).lean();}}catch{}
  const allRides=[
    ...liveRidesToday.map(r=>({rideId:r._id.toString(),status:r.status,routeType:r.routeType||'fastest',passengerCount:r.passengerCount||1,zoneCode:r.pickupZoneCode||'Z01',fare:r.fare?.total||0,createdAt:r.requestedAt||r.createdAt,pickup:r.pickup?.coordinates,dropoff:r.dropoff?.coordinates})),
    ...bookingRidesToday.map(r=>({rideId:r.rideId||r._id.toString(),status:(r.status||'requested').toUpperCase(),routeType:'fastest',passengerCount:r.passengerCount||1,zoneCode:'Z01',fare:120,createdAt:r.createdAt,pickup:r.pickup?.coordinates,dropoff:r.dropoff?.coordinates}))
  ];
  const totalRides=allRides.length;
  const completedRides=allRides.filter(r=>['COMPLETED','completed'].includes(r.status)).length;
  const cancelledRides=allRides.filter(r=>['CANCELLED','cancelled'].includes(r.status)).length;
  const activeRides=allRides.filter(r=>['REQUESTED','OFFERED','REASSIGNING','ACCEPTED','ARRIVING','ONGOING','requested','searching','offered','accepted','in_progress'].includes(r.status)).length;
  const totalRevenue=allRides.filter(r=>['COMPLETED','completed'].includes(r.status)).reduce((acc,r)=>acc+(r.fare||0),0);
  const routeTypes={fastest:allRides.filter(r=>r.routeType==='fastest').length,shortest:allRides.filter(r=>r.routeType==='shortest').length,eco:allRides.filter(r=>r.routeType==='eco').length};
  res.json({
    period:'today',
    summary:{totalRides,completedRides,cancelledRides,activeRides,activeDrivers,availableDrivers,busyDrivers,offlineDrivers:allDrivers.length-activeDrivers,avgDriverUtilisation:activeDrivers>0?+(busyDrivers/activeDrivers).toFixed(2):0,totalRevenue:+totalRevenue.toFixed(2),avgWaitTimeMin:4.2},
    routeTypeDistribution:routeTypes,
    drivers:allDrivers.slice(0,30),
    recentRides:allRides.slice(0,15)
  });
}));

router.get('/admin/applications', run(async (req, res) => {
  let applications = [];
  try {
    applications = await DriverApplication.find({}).sort({ createdAt: -1 }).lean();
  } catch {}

  const cancelledRides = await Ride.find({ status: 'CANCELLED' })
    .sort({ cancelledAt: -1, createdAt: -1 })
    .limit(30)
    .lean();

  res.json({
    applications: applications.map(a => ({
      id: a._id.toString(),
      name: a.name,
      email: a.email,
      phone: a.phone,
      vehicleType: a.vehicleType,
      plate: a.plate,
      zoneCode: a.zoneCode,
      status: a.status,
      submittedAt: a.submittedAt || a.createdAt,
      reviewedAt: a.reviewedAt
    })),
    cancelledRides: cancelledRides.map(r => ({
      rideId: r._id.toString(),
      status: r.status,
      pickupZoneCode: r.pickupZoneCode || 'Z01',
      fare: r.fare?.total || 120,
      cancelledAt: r.cancelledAt || r.updatedAt || r.createdAt,
      passengerCount: r.passengerCount || 1,
      reason: r.metadata?.cancellationReason || 'Passenger cancelled prior to pickup'
    })),
    counts: {
      totalApplications: applications.length,
      processing: applications.filter(a => a.status === 'PROCESSING').length,
      approved: applications.filter(a => a.status === 'APPROVED').length,
      rejected: applications.filter(a => a.status === 'REJECTED').length,
      cancelledRides: cancelledRides.length
    }
  });
}));

router.patch('/admin/applications/:id', run(async (req, res) => {
  const { status } = req.body;
  if (!['PROCESSING', 'APPROVED', 'REJECTED'].includes(status)) {
    throw fail(400, 'VALIDATION_ERROR', 'status must be PROCESSING, APPROVED, or REJECTED');
  }

  const appDoc = await DriverApplication.findByIdAndUpdate(
    req.params.id,
    { $set: { status, reviewedAt: new Date() } },
    { new: true }
  );
  if (!appDoc) throw fail(404, 'NOT_FOUND', 'Application not found');

  if (status === 'APPROVED') {
    try {
      await Driver.findOneAndUpdate(
        { externalId: `APP-${appDoc.plate}` },
        {
          $set: {
            externalId: `APP-${appDoc.plate}`,
            name: appDoc.name,
            location: { type: 'Point', coordinates: [74.4977, 15.8497] },
            zoneCode: appDoc.zoneCode || 'Z01',
            status: 'AVAILABLE',
            vehicle: { type: appDoc.vehicleType || 'CAR', plate: appDoc.plate, capacity: 4 },
            idleSince: new Date(),
            lastLocationAt: new Date(),
            acceptanceRate: 0.9
          }
        },
        { upsert: true }
      );
    } catch (e) {
      console.warn('Driver provisioning error:', e.message);
    }
  }

  res.json({
    id: appDoc._id.toString(),
    status: appDoc.status,
    name: appDoc.name,
    reviewedAt: appDoc.reviewedAt
  });
}));

export default router;
