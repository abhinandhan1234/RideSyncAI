import { Driver,Ride } from '../../models/index.js';
import { ai } from './client.js';

// Both members share one ride document, reservation and lifecycle.
export async function joinPool({passengerId,pickup,dropoff,passengerCount,type,io}) {
  const rides=await Ride.find({source:'LIVE',status:'OFFERED',poolingRequested:true,
    passengerId:{$ne:passengerId},poolMember:null,requestedVehicleType:type}).limit(20).lean();
  for(const ride of rides) {
    const driver=await Driver.findOne({_id:ride.driverId,activeRideId:ride._id,status:'RESERVED'}).lean();
    if(!driver || driver.vehicle.capacity<ride.passengerCount+passengerCount) continue;
    const requests=[{pickup:ride.pickup.coordinates,dropoff:ride.dropoff.coordinates,seats:ride.passengerCount},
      {pickup:pickup.coordinates,dropoff:dropoff.coordinates,seats:passengerCount}];
    const result=await ai('pool',{requests,capacity:driver.vehicle.capacity,detour:.25});
    // Existing offer navigates to the original passenger's pickup.
    if(!result.feasible || result.pooled.order[0]!=='pickup1') continue;
    const surge=ride.fare.surge;
    const total=+(result.pooled.fareINR*surge).toFixed(2);
    const first=+(result.pooled.passengers[0].pooledFareINR*surge).toFixed(2);
    const second=+(total-first).toFixed(2);
    const updated=await Ride.findOneAndUpdate({_id:ride._id,status:'OFFERED',activeOfferId:ride.activeOfferId,
      driverId:driver._id,poolMember:null},{$set:{poolMember:passengerId,poolPlan:{...result,requests,fares:[first,second]},
      passengerCount:ride.passengerCount+passengerCount,'fare.total':total}},{new:true});
    if(updated) {
      io?.to('user:'+ride.passengerId).emit('ride:pooled',{rideId:ride._id,status:updated.status});
      return {rideId:updated.id,status:updated.status,fareEstimate:second,surgeMultiplier:surge,pool:updated.poolPlan};
    }
  }
}
