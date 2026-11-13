import 'dotenv/config';
import mongoose from 'mongoose';
import {connectDB} from '../src/db.js';
import {User,Driver,Zone,Ride,RideOffer,DemandHistory} from '../src/models.js';
await connectDB();
try{
 const count={users:await User.countDocuments(),drivers:await Driver.countDocuments(),zones:await Zone.countDocuments(),
  rides:await Ride.countDocuments(),offers:await RideOffer.countDocuments(),demandHistory:await DemandHistory.countDocuments()};
 const errors=[];
 const badRides=await Ride.find({$or:[{'pickup.coordinates.1':{$lt:-90}},{'dropoff.coordinates.1':{$gt:90}}]}).limit(3);
 if(badRides.length)errors.push('Invalid latitudes on rides');
 const active=await Driver.find({status:{$in:['BUSY','RESERVED']},activeRideId:null}).limit(3);
 if(active.length)errors.push('BUSY/RESERVED drivers without an active ride');
 const dangling=await Ride.aggregate([{$match:{driverId:{$ne:null}}},{$lookup:{from:'drivers',localField:'driverId',foreignField:'_id',as:'driver'}},{$match:{driver:{$size:0}}},{$limit:3}]);
 if(dangling.length)errors.push('Some rides point to non-existent drivers');
 const wrongOrder=await Ride.find({$expr:{$and:[{$ne:['$acceptedAt',null]},{$lt:['$acceptedAt','$requestedAt']}]}}).limit(3);
 if(wrongOrder.length)errors.push('acceptedAt earlier than requestedAt');
 const sample=await Driver.findOne({status:'AVAILABLE'});
 if(sample){
  const nearby=await Driver.find({location:{$near:{$geometry:sample.location,$maxDistance:1000}}}).limit(3).select('_id').lean();
  if(!nearby.length)errors.push('2dsphere near query returned no nearby drivers');
 }
 console.log(JSON.stringify({count,checks:{geo2dsphere:'queried',timestamps:'queried',referential:'queried'},errors},null,2));
 if(errors.length)process.exitCode=1;
}finally{await mongoose.disconnect();}
