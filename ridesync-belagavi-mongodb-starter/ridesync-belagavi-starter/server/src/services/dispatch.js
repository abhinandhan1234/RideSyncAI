import { Driver, Ride, RideOffer, RideEvent } from '../models.js';
import { scoreDriver } from './algorithms.js';
const maxAttempts = () => Math.max(1, Number(process.env.MAX_ASSIGNMENT_ATTEMPTS || 4));
const timeoutSeconds = () => Math.max(5, Number(process.env.RIDE_OFFER_TIMEOUT_SECONDS || 20));
const event = (rideId,type,details={}) => RideEvent.create({rideId,type,details});
const emitRide = (io, rideId, payload) => io.to(`ride:${rideId}`).emit('ride:update',payload);

export async function releaseDriver(driverId, rideId) {
  await Driver.updateOne({ _id:driverId, activeRideId:rideId, status: { $in:['RESERVED','BUSY'] } },
    { $set: {status:'AVAILABLE',activeRideId:null,idleSince:new Date(),currentWorkload:0} });
}

export async function dispatchNext(rideId,io) {
  const ride = await Ride.findById(rideId);
  if(!ride || ride.status!=='REQUESTED') return {status:'NOT_REQUESTED'};
  if(ride.attemptCount>=maxAttempts()){
    await Ride.updateOne({_id:ride._id,status:'REQUESTED'},{$set:{status:'FAILED'}});
    await event(rideId,'FAILED_NO_DRIVER'); emitRide(io,rideId,{status:'FAILED'});
    return {status:'FAILED'};
  }
  const already = await RideOffer.find({rideId:ride._id}).distinct('driverId');
  const fresh=new Date(Date.now()-5*60*1000);
  const nearby = await Driver.find({
    status:'AVAILABLE',activeRideId:null,lastLocationAt:{$gte:fresh},
    'vehicle.capacity':{$gte:ride.passengerCount}, _id:{$nin:already},
    location:{$near:{$geometry:ride.pickup,$maxDistance:12000}}
  }).limit(30).lean();
  const ranked=nearby.map(d=>({...scoreDriver(d,ride),driver:d})).sort((a,b)=>b.score-a.score);
  for(const candidate of ranked){
    // Compare-and-set makes claiming a single driver atomic even under competing requests.
    const driver=await Driver.findOneAndUpdate({_id:candidate.driver._id,status:'AVAILABLE',activeRideId:null},
      {$set:{status:'RESERVED',activeRideId:ride._id},$inc:{totalOffers:1}}, {new:true});
    if(!driver)continue;
    const nextAttempt=ride.attemptCount+1, offeredAt=new Date();
    let offer;
    try{
      const updated=await Ride.findOneAndUpdate({_id:ride._id,status:'REQUESTED',attemptCount:ride.attemptCount},
        {$set:{status:'OFFERED',driverId:driver._id,pickupEtaMin:candidate.etaMin},$inc:{attemptCount:1}}, {new:true});
      if(!updated){await releaseDriver(driver._id,ride._id);return {status:'ALREADY_DISPATCHED'};}
      offer=await RideOffer.create({rideId:ride._id,driverId:driver._id,attempt:nextAttempt,
        score:candidate.score,scoreFactors:candidate.factors,distanceKm:candidate.distanceKm,
        estimatedPickupMin:candidate.etaMin,offeredAt,expiresAt:new Date(offeredAt.getTime()+timeoutSeconds()*1000)});
      await Ride.updateOne({_id:ride._id,status:'OFFERED'},{$set:{activeOfferId:offer._id}});
      await event(ride._id,'OFFER_SENT',{driverId:String(driver._id),attempt:nextAttempt,score:candidate.score});
      io.to(`user:${driver.userId}`).emit('ride:request',{rideId:String(ride._id),offerId:String(offer._id),expiresAt:offer.expiresAt});
      emitRide(io,rideId,{status:'OFFERED',attempt:nextAttempt});
      return {status:'OFFERED',offerId:offer._id,driverId:driver._id,score:candidate.score};
    }catch(err){
      if(offer) await RideOffer.updateOne({_id:offer._id},{$set:{status:'CANCELLED'}});
      await Ride.updateOne({_id:ride._id,status:'OFFERED',driverId:driver._id},{$set:{status:'REQUESTED',driverId:null,activeOfferId:null},$inc:{attemptCount:0}});
      await releaseDriver(driver._id,ride._id);
      throw err;
    }
  }
  await Ride.updateOne({_id:ride._id,status:'REQUESTED'},{$set:{status:'FAILED'}});
  await event(rideId,'FAILED_NO_AVAILABLE_DRIVER');emitRide(io,rideId,{status:'FAILED'});
  return {status:'FAILED'};
}

export async function respondToOffer({rideId,offerId,driverUserId,accept,io}){
  const driver=await Driver.findOne({userId:driverUserId});
  if(!driver)throw Object.assign(new Error('Driver profile not found'),{status:403});
  const now=new Date();
  const offer=await RideOffer.findOneAndUpdate({ _id:offerId,rideId,driverId:driver._id,status:'PENDING',expiresAt:{$gt:now} },
    {$set:{status:accept?'ACCEPTED':'REJECTED',respondedAt:now}},{new:true});
  if(!offer)throw Object.assign(new Error('Offer expired, not found or already answered'),{status:409});
  if(accept){
    const ride=await Ride.findOneAndUpdate({_id:rideId,status:'OFFERED',activeOfferId:offer._id},
      {$set:{status:'ACCEPTED',acceptedAt:now}},{new:true});
    if(!ride){await RideOffer.updateOne({_id:offer._id},{$set:{status:'CANCELLED'}});await releaseDriver(driver._id,rideId);throw Object.assign(new Error('Ride state changed'),{status:409});}
    await Driver.updateOne({_id:driver._id,status:'RESERVED',activeRideId:ride._id},{$set:{status:'BUSY',currentWorkload:1},$inc:{acceptedOffers:1}});
    await event(rideId,'DRIVER_ACCEPTED',{driverId:String(driver._id)});
    emitRide(io,rideId,{status:'ACCEPTED',driverId:String(driver._id)});
    return {status:'ACCEPTED'};
  }
  const ride=await Ride.findOneAndUpdate({_id:rideId,status:'OFFERED',activeOfferId:offer._id},
    {$set:{status:'REQUESTED',activeOfferId:null,driverId:null}});
  await releaseDriver(driver._id,rideId);
  await event(rideId,'DRIVER_REJECTED',{driverId:String(driver._id)});
  emitRide(io,rideId,{status:'REQUESTED',reason:'DRIVER_REJECTED'});
  if(ride)return dispatchNext(rideId,io);
  return {status:'NO_ACTION'};
}
export async function expireOffers(io){
  const expired=await RideOffer.find({status:'PENDING',expiresAt:{$lte:new Date()}}).limit(100);
  for(const original of expired){
    const offer=await RideOffer.findOneAndUpdate({_id:original._id,status:'PENDING'},{$set:{status:'EXPIRED',respondedAt:new Date()}},{new:true});
    if(!offer)continue;
    const ride=await Ride.findOneAndUpdate({_id:offer.rideId,status:'OFFERED',activeOfferId:offer._id},
      {$set:{status:'REQUESTED',driverId:null,activeOfferId:null}});
    await releaseDriver(offer.driverId,offer.rideId);
    await event(offer.rideId,'OFFER_EXPIRED',{driverId:String(offer.driverId)});
    if(ride)await dispatchNext(offer.rideId,io);
  }
}
