import {Driver,Ride,RideOffer,RideEvent} from '../../models/index.js';
import {ai} from '../ps2/client.js';
const timeout=()=>Number(process.env.OFFER_TIMEOUT_MS||20000);
const maxAttempts=()=>Number(process.env.MAX_ASSIGNMENT_ATTEMPTS||5);
export const record=(rideId,type,details={})=>RideEvent.create({rideId,type,details});
export async function release(driverId,rideId){await Driver.updateOne({_id:driverId,activeRideId:rideId},{$set:{status:'AVAILABLE',activeRideId:null,idleSince:new Date(),currentWorkload:0}});}
async function dispatchOnce(rideId,io){const ride=await Ride.findById(rideId);if(!ride||!['REQUESTED','REASSIGNING'].includes(ride.status))return;
 if(ride.attemptCount>=maxAttempts()){await Ride.updateOne({_id:rideId,status:ride.status},{$set:{status:'FAILED'}});await record(rideId,'FAILED');return;}
 const excluded=await RideOffer.distinct('driverId',{rideId});const candidates=await Driver.find({zoneCode:/^Z0[1-8]$/,status:'AVAILABLE',activeRideId:null,'vehicle.capacity':{$gte:ride.passengerCount},...(ride.requestedVehicleType?{'vehicle.type':ride.requestedVehicleType}:{}) ,_id:{$nin:excluded},location:{$near:{$geometry:ride.pickup,$maxDistance:5000}}}).limit(40).lean();
 const policy=process.env.PS2_DISPATCH_POLICY||'constrained';
 const penalty=Number(process.env.PS2_ETA_PENALTY_MINUTES??1);
 if(!['nearest','eta','weighted','constrained'].includes(policy)||!Number.isFinite(penalty)||penalty<0) throw Error('Invalid dispatch configuration');
 const options=candidates.map(d=>({id:String(d._id),point:d.location.coordinates,assigned:d.acceptedOffers||0,
   completed:d.completedRides||0,acceptance:d.acceptanceRate??.8,idle:Math.max(0,(Date.now()-new Date(d.idleSince||Date.now()))/60000)}));
 const ranked=options.length?await ai('rank',{policy,penalty,pickup:ride.pickup.coordinates,options}):[];
 for(const result of ranked){const choice={etaMinutes:result.eta,score:result.score,distanceKm:result.km,factors:{...result,policy,penalty}};
 let revised;
 if(ride.poolMember){
   const candidate=candidates.find(d=>String(d._id)===result.id);
   revised=await ai('pool',{requests:ride.poolPlan.requests,origin:candidate.location.coordinates,
     vehicle:ride.requestedVehicleType==='CAR'?'cab':ride.requestedVehicleType.toLowerCase(),capacity:candidate.vehicle.capacity,detour:.25});
   if(!revised.feasible)continue;
   revised.pooled.passengers.forEach((p,i)=>Object.assign(p,{payableINR:ride.poolPlan.fares[i],
     savingINR:+(p.separateFareINR*ride.fare.surge-ride.poolPlan.fares[i]).toFixed(2),surge:ride.fare.surge}));
 }
 const driver=await Driver.findOneAndUpdate({_id:result.id,status:'AVAILABLE',activeRideId:null,zoneCode:/^Z0[1-8]$/,'vehicle.capacity':{$gte:ride.passengerCount},'vehicle.type':ride.requestedVehicleType},{$set:{status:'RESERVED',activeRideId:rideId},$inc:{totalOffers:1}},{new:true});if(!driver)continue;
  const updated=await Ride.findOneAndUpdate({_id:rideId,status:ride.status,poolMember:ride.poolMember??null,attemptCount:ride.attemptCount},{$set:{...(revised?{'poolPlan.pooled':revised.pooled,'poolPlan.separate':revised.separate}:{}),status:'OFFERED',driverId:driver._id,pickupEtaMin:choice.etaMinutes,'metadata.selection':choice.factors},$inc:{attemptCount:1}},{new:true});if(!updated){await release(driver._id,rideId);return;}
  try{const offeredAt=new Date();const offer=await RideOffer.create({rideId,driverId:driver._id,attempt:updated.attemptCount,status:'PENDING',score:choice.score,scoreFactors:choice.factors,distanceKm:choice.distanceKm,estimatedPickupMin:choice.etaMinutes,offeredAt,expiresAt:new Date(offeredAt.getTime()+timeout())});await Ride.updateOne({_id:rideId,status:'OFFERED',driverId:driver._id},{$set:{activeOfferId:offer._id}});await record(rideId,'OFFERED',{offerId:offer.id});io?.to(`user:${driver.userId}`).emit('ride:offer',{rideId:String(rideId),offerId:offer.id,expiresAt:offer.expiresAt});return offer;}catch(error){await Ride.updateOne({_id:rideId,status:'OFFERED',driverId:driver._id},{$set:{status:'REASSIGNING',driverId:null,activeOfferId:null}});await release(driver._id,rideId);throw error;}}
 await Ride.updateOne({_id:rideId,status:ride.status},{$set:{status:'FAILED'}});await record(rideId,'FAILED_NO_DRIVER');}
export async function expireOffers(io){
 const delayed=await Ride.find({source:'LIVE',status:'ACCEPTED',arrivalDeadline:{$lte:new Date()}}).limit(100);
 for(const snapshot of delayed){
   const ride=await Ride.findOneAndUpdate({_id:snapshot._id,status:'ACCEPTED',driverId:snapshot.driverId,
     arrivalDeadline:{$lte:new Date()}},{$set:{status:'REASSIGNING',activeOfferId:null,driverId:null,arrivalDeadline:null}},{new:true});
   if(!ride) continue;
   await release(snapshot.driverId,ride._id);
   await record(ride._id,'ARRIVAL_DELAY');
   io?.to(['user:'+ride.passengerId,...(ride.poolMember?['user:'+ride.poolMember]:[])]).emit('ride:reassigning',{rideId:ride.id,reason:'ARRIVAL_DELAY'});
   await dispatch(ride._id,io);
 }
const expired=await RideOffer.find({status:'PENDING',expiresAt:{$lte:new Date()}}).limit(100);for(const item of expired){const offer=await RideOffer.findOneAndUpdate({_id:item._id,status:'PENDING'},{$set:{status:'EXPIRED',respondedAt:new Date()}});if(!offer)continue;const ride=await Ride.findOneAndUpdate({_id:item.rideId,status:'OFFERED',activeOfferId:item._id},{$set:{status:'REASSIGNING',activeOfferId:null,driverId:null}});await release(item.driverId,item.rideId);if(ride){await record(item.rideId,'TIMED_OUT');await dispatch(item.rideId,io);}}}

// Track asynchronous dispatch so shutdown and test teardown cannot disconnect mid-write.
const pendingDispatch = new Set();
export function dispatch(rideId, io) {
 const task = dispatchOnce(rideId, io);
 pendingDispatch.add(task);
 task.then(() => pendingDispatch.delete(task), () => pendingDispatch.delete(task));
 return task;
}
export async function drainDispatch() { await Promise.allSettled([...pendingDispatch]); }
