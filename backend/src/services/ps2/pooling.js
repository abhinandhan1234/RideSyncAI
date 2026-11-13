import { Driver,Ride,RideOffer } from '../../models/index.js';
import { ai } from './client.js';

// Both members share one ride document, reservation and lifecycle.
export async function joinPool({passengerId,pickup,dropoff,passengerCount,type,io,quote=false,target}) {
  const rides=await Ride.find({...(target?{_id:target}:{}),source:'LIVE',status:'OFFERED',poolingRequested:true,
    passengerId:{$ne:passengerId},poolMember:null,requestedVehicleType:type}).limit(20).lean();
  for(const ride of rides) {
    const driver=await Driver.findOne({_id:ride.driverId,activeRideId:ride._id,status:'RESERVED'}).lean();
    if(!driver || driver.vehicle.capacity<ride.passengerCount+passengerCount) continue;
    const requests=[{pickup:ride.pickup.coordinates,dropoff:ride.dropoff.coordinates,seats:ride.passengerCount},
      {pickup:pickup.coordinates,dropoff:dropoff.coordinates,seats:passengerCount}];
    const result=await ai('pool',{origin:driver.location.coordinates,vehicle:type==='CAR'?'cab':type.toLowerCase(),requests,capacity:driver.vehicle.capacity,detour:.25});
    // Existing offer navigates to the original passenger's pickup.
    if(!result.feasible || result.pooled.order[0]!=='pickup1') continue;
    const surge=ride.fare.surge;
    const total=+(result.pooled.fareINR*surge).toFixed(2);
    const solo=result.pooled.passengers.map(p=>+(p.separateFareINR*surge).toFixed(2));
    const first=+(total*solo[0]/(solo[0]+solo[1])).toFixed(2);
    const second=+(total-first).toFixed(2);
    if(first>ride.fare.total || second>=solo[1]) continue;
    const fares=[first,second];
    result.pooled.passengers.forEach((p,i)=>Object.assign(p,{payableINR:fares[i],savingINR:+(solo[i]-fares[i]).toFixed(2),surge}));
    if(quote) return {rideId:ride._id,pool:result,fareEstimate:second};
    const updated=await Ride.db.transaction(async session=>{
      // Serialize the join with acceptance/expiry by writing the pending offer in the same transaction.
      const locked=await RideOffer.updateOne({_id:ride.activeOfferId,status:'PENDING',expiresAt:{$gt:new Date()}},
        {$currentDate:{updatedAt:true}},{session});
      if(!locked.matchedCount)return null;
      return Ride.findOneAndUpdate({_id:ride._id,status:'OFFERED',activeOfferId:ride.activeOfferId,
        driverId:driver._id,poolMember:null},{$set:{poolMember:passengerId,poolPlan:{...result,requests,fares,stopIndex:0},
        passengerCount:ride.passengerCount+passengerCount,'fare.total':total}},{new:true,session});
    });
    if(updated) {
      for(const user of [ride.passengerId,passengerId,driver.userId]) io?.to("user:"+user).emit("POOL_JOINED",{rideId:ride.id});
      io?.to('user:'+ride.passengerId).emit('ride:pooled',{rideId:ride._id,status:updated.status});
      return {rideId:updated.id,status:updated.status,fareEstimate:second,surgeMultiplier:surge,pool:updated.poolPlan};
    }
  }
}
