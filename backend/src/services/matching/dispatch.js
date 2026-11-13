import {Driver,Ride,RideOffer,RideEvent} from '../../models/index.js';
import {rankDrivers} from './rank.js';
const timeout=()=>Number(process.env.OFFER_TIMEOUT_MS||20000);
const maxAttempts=()=>Number(process.env.MAX_ASSIGNMENT_ATTEMPTS||5);
const productionVerification=()=>process.env.NODE_ENV==='production'?{approvalStatus:'APPROVED','verification.aadhaar.status':'VERIFIED','verification.aadhaar.provider':'CASHFREE','verification.aadhaar.mode':'live','verification.drivingLicense.status':'VERIFIED','verification.drivingLicense.provider':'CASHFREE','verification.drivingLicense.mode':'live'}:{};
export const record=(rideId,type,details={})=>RideEvent.create({rideId,type,details});
export async function release(driverId,rideId){await Driver.updateOne({_id:driverId,activeRideId:rideId},{$set:{status:'AVAILABLE',activeRideId:null,idleSince:new Date(),currentWorkload:0}});}
async function dispatchOnce(rideId,io){const ride=await Ride.findById(rideId);if(!ride||!['REQUESTED','REASSIGNING'].includes(ride.status))return;
 if(ride.attemptCount>=maxAttempts()){await Ride.updateOne({_id:rideId,status:ride.status},{$set:{status:'FAILED'}});await record(rideId,'FAILED');return;}
 const excluded=await RideOffer.distinct('driverId',{rideId});const candidates=await Driver.find({zoneCode:/^Z0[1-8]$/,status:'AVAILABLE',activeRideId:null,...productionVerification(),'vehicle.capacity':{$gte:ride.passengerCount},...(ride.requestedVehicleType?{'vehicle.type':ride.requestedVehicleType}:{}) ,_id:{$nin:excluded},location:{$near:{$geometry:ride.pickup,$maxDistance:5000}}}).limit(40).lean();
 for(const choice of rankDrivers(ride,candidates)){const driver=await Driver.findOneAndUpdate({_id:choice.driver._id,status:'AVAILABLE',activeRideId:null},{$set:{status:'RESERVED',activeRideId:rideId},$inc:{totalOffers:1}},{new:true});if(!driver)continue;
  const updated=await Ride.findOneAndUpdate({_id:rideId,status:ride.status,attemptCount:ride.attemptCount},{$set:{status:'OFFERED',driverId:driver._id,pickupEtaMin:choice.etaMinutes},$inc:{attemptCount:1}},{new:true});if(!updated){await release(driver._id,rideId);return;}
  try{const offeredAt=new Date();const offer=await RideOffer.create({rideId,driverId:driver._id,attempt:updated.attemptCount,status:'PENDING',score:choice.score,scoreFactors:choice.factors,distanceKm:choice.distanceKm,estimatedPickupMin:choice.etaMinutes,offeredAt,expiresAt:new Date(offeredAt.getTime()+timeout())});await Ride.updateOne({_id:rideId,status:'OFFERED',driverId:driver._id},{$set:{activeOfferId:offer._id}});await record(rideId,'OFFERED',{offerId:offer.id});io?.to(`user:${driver.userId}`).emit('ride:offer',{rideId:String(rideId),offerId:offer.id,expiresAt:offer.expiresAt});return offer;}catch(error){await Ride.updateOne({_id:rideId,status:'OFFERED',driverId:driver._id},{$set:{status:'REASSIGNING',driverId:null,activeOfferId:null}});await release(driver._id,rideId);throw error;}}
 await Ride.updateOne({_id:rideId,status:ride.status},{$set:{status:'FAILED'}});await record(rideId,'FAILED_NO_DRIVER');}
export async function expireOffers(io){const expired=await RideOffer.find({status:'PENDING',expiresAt:{$lte:new Date()}}).limit(100);for(const item of expired){const offer=await RideOffer.findOneAndUpdate({_id:item._id,status:'PENDING'},{$set:{status:'EXPIRED',respondedAt:new Date()}});if(!offer)continue;const ride=await Ride.findOneAndUpdate({_id:item.rideId,status:'OFFERED',activeOfferId:item._id},{$set:{status:'REASSIGNING',activeOfferId:null,driverId:null}});await release(item.driverId,item.rideId);if(ride){await record(item.rideId,'TIMED_OUT');await dispatch(item.rideId,io);}}}

// Track asynchronous dispatch so shutdown and test teardown cannot disconnect mid-write.
const pendingDispatch = new Set();
export function dispatch(rideId, io) {
 const task = dispatchOnce(rideId, io);
 pendingDispatch.add(task);
 task.then(() => pendingDispatch.delete(task), () => pendingDispatch.delete(task));
 return task;
}
export async function drainDispatch() { await Promise.allSettled([...pendingDispatch]); }
