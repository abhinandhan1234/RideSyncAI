import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { connectDB } from './db.js';
import { User,Driver,Zone,Ride,RideOffer,RideEvent,DemandHistory,DemandPrediction,ZonePricing,DriverLocation } from './models.js';
import { point,haversineKm } from './models-helpers.js';
import { dispatchNext,respondToOffer,expireOffers,releaseDriver } from './services/dispatch.js';
import { estimateFare,poolingCompatible,surgeMultiplier, pickupEstimateKm,pickupEstimateMin,hungarian,scoreDriver } from './services/algorithms.js';

const app=express(), server=http.createServer(app);
const allowedOrigin=process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const io=new Server(server,{cors:{origin:allowedOrigin}});
app.use(helmet());
app.use(cors({origin:allowedOrigin}));
app.use(express.json({limit:'100kb'}));
app.use('/api/auth',rateLimit({windowMs:60_000,limit:30,standardHeaders:'draft-7',legacyHeaders:false}));
const secret=process.env.JWT_SECRET;
if(!secret || secret.length<32) throw new Error('Set JWT_SECRET to a random string of at least 32 characters');
const wrap=(fn)=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const validPoint=(p)=>p&&Number.isFinite(Number(p.lng))&&Number.isFinite(Number(p.lat))&&
 Number(p.lng)>=-180&&Number(p.lng)<=180&&Number(p.lat)>=-90&&Number(p.lat)<=90;
const toPoint=(p)=>point(p.lng,p.lat);
const objId=(value)=>mongoose.isValidObjectId(value);
const current=()=>new Date();
function auth(req,res,next){
 const token=/^Bearer (.+)$/i.exec(req.headers.authorization||'')?.[1];
 if(!token)return next(fail('Authentication required',401));
 try{const payload=jwt.verify(token,secret);req.auth={userId:payload.sub,role:payload.role};next();}
 catch{return next(fail('Invalid or expired token',401));}
}
const roles=(...accepted)=>(req,res,next)=>accepted.includes(req.auth?.role)?next():next(fail('Forbidden',403));
const publicRide=(r)=>({id:r._id,status:r.status,driverId:r.driverId,pickup:r.pickup,dropoff:r.dropoff,
 pickupZoneCode:r.pickupZoneCode,dropoffZoneCode:r.dropoffZoneCode,passengerCount:r.passengerCount,
 fare:r.fare,attemptCount:r.attemptCount,pickupEtaMin:r.pickupEtaMin,requestedAt:r.requestedAt});
async function authorizeRide(req,ride){
 if(req.auth.role==='ADMIN')return true;
 if(String(ride.passengerId)===req.auth.userId)return true;
 if(ride.driverId){const d=await Driver.findById(ride.driverId).select('userId');if(String(d?.userId)===req.auth.userId)return true;}
 return false;
}

app.get('/api/health',(req,res)=>res.json({ok:true,service:'ridesync-belagavi',database:mongoose.connection.readyState===1?'connected':'disconnected'}));
app.post('/api/auth/register',wrap(async(req,res)=>{
 const {name,email,password}=req.body;
 if(!name || !email || typeof password!=='string' || password.length<8)throw fail('Name, email and password (8+ chars) are required');
 const user=await User.create({displayName:name,email,passwordHash:await bcrypt.hash(password,10),role:'PASSENGER'});
 res.status(201).json({id:user.id,email:user.email,role:user.role});
}));
app.post('/api/auth/login',wrap(async(req,res)=>{
 const user=await User.findOne({email:String(req.body.email||'').toLowerCase()}).select('+passwordHash');
 if(!user || !await bcrypt.compare(String(req.body.password||''),user.passwordHash))throw fail('Invalid credentials',401);
 const token=jwt.sign({sub:String(user._id),role:user.role},secret,{expiresIn:'8h'});
 res.json({token,user:{id:user._id,name:user.displayName,role:user.role}});
}));
app.get('/api/auth/me',auth,wrap(async(req,res)=>{
 const user=await User.findById(req.auth.userId).select('displayName email role');
 if(!user)throw fail('Account not found',404);
 res.json(user);
}));

app.get('/api/zones',wrap(async(req,res)=>res.json(await Zone.find().sort('code').lean())));
app.get('/api/drivers/nearby',auth,roles('PASSENGER','ADMIN'),wrap(async(req,res)=>{
 const lat=Number(req.query.lat),lng=Number(req.query.lng);
 if(!validPoint({lat,lng}))throw fail('Valid lat and lng query parameters required');
 const available=await Driver.find({status:'AVAILABLE',activeRideId:null,lastLocationAt:{$gte:new Date(Date.now()-300000)},
  location:{$near:{$geometry:point(lng,lat),$maxDistance:12000}}})
   .select('location vehicle zoneCode status lastLocationAt').limit(40).lean();
 res.json(available);
}));
app.patch('/api/drivers/me/location',auth,roles('DRIVER'),wrap(async(req,res)=>{
 if(!validPoint(req.body))throw fail('Valid lat and lng required');
 const driver=await Driver.findOneAndUpdate({userId:req.auth.userId},{$set:{location:toPoint(req.body),lastLocationAt:current()}},{new:true});
 if(!driver)throw fail('Driver profile not found',404);
 await DriverLocation.create({driverId:driver._id,point:driver.location,source:'SIMULATED'});
 io.to(`user:${req.auth.userId}`).emit('driver:location',{location:driver.location});
 res.json({status:driver.status,location:driver.location});
}));
app.patch('/api/drivers/me/availability',auth,roles('DRIVER'),wrap(async(req,res)=>{
 if(typeof req.body.available!=='boolean')throw fail('available must be true or false');
 const driver=await Driver.findOneAndUpdate({userId:req.auth.userId,status:{$in:['OFFLINE','AVAILABLE']},activeRideId:null},
  {$set:{status:req.body.available?'AVAILABLE':'OFFLINE',idleSince:current(),lastLocationAt:current()}},{new:true});
 if(!driver)throw fail('Cannot change availability during a ride',409);
 res.json({status:driver.status});
}));
app.get('/api/driver/offers',auth,roles('DRIVER'),wrap(async(req,res)=>{
 const driver=await Driver.findOne({userId:req.auth.userId});
 if(!driver)throw fail('Driver not found',404);
 res.json(await RideOffer.find({driverId:driver._id,status:'PENDING',expiresAt:{$gt:current()}}).lean());
}));

app.post('/api/rides',auth,roles('PASSENGER'),wrap(async(req,res)=>{
 const {pickup,dropoff,passengerCount=1,poolingRequested=false,pickupZoneCode,dropoffZoneCode}=req.body;
 if(!validPoint(pickup)||!validPoint(dropoff))throw fail('Both pickup and dropoff need valid lat/lng');
 if(!Number.isInteger(passengerCount)||passengerCount<1||passengerCount>4)throw fail('passengerCount must be 1-4');
 if(!pickupZoneCode||!dropoffZoneCode)throw fail('pickupZoneCode and dropoffZoneCode required');
 const zones=await Zone.countDocuments({code:{$in:[pickupZoneCode,dropoffZoneCode]}});
 if(zones!==new Set([pickupZoneCode,dropoffZoneCode]).size)throw fail('Unknown zone code');
 const a=toPoint(pickup),b=toPoint(dropoff),straight=haversineKm(a,b);
 const distanceKm=pickupEstimateKm(straight),estimatedDurationMin=pickupEstimateMin(straight);
 const latest=await ZonePricing.findOne({zoneCode:pickupZoneCode}).sort({calculatedAt:-1});
 const multiplier=latest?.multiplier??1;
 const ride=await Ride.create({passengerId:req.auth.userId,pickup:a,dropoff:b,pickupZoneCode,dropoffZoneCode,
  passengerCount,poolingRequested,source:'LIVE',distanceKm,estimatedDurationMin,
  fare:estimateFare(distanceKm,estimatedDurationMin,multiplier)});
 await RideEvent.create({rideId:ride._id,type:'RIDE_REQUESTED',actor:'PASSENGER',actorUserId:req.auth.userId});
 const dispatch=await dispatchNext(ride._id,io);
 res.status(201).json({rideId:ride._id,status:dispatch.status,dispatch,estimateSource:'SIMULATED_FALLBACK'});
}));
app.get('/api/rides/history',auth,roles('PASSENGER'),wrap(async(req,res)=>{
 res.json(await Ride.find({passengerId:req.auth.userId,source:'LIVE'}).sort({requestedAt:-1}).limit(50).select('-__v').lean());
}));
app.get('/api/rides/:id',auth,wrap(async(req,res)=>{
 if(!objId(req.params.id))throw fail('Invalid ride id');
 const ride=await Ride.findById(req.params.id);
 if(!ride)throw fail('Ride not found',404);
 if(!await authorizeRide(req,ride))throw fail('Forbidden',403);
 res.json(publicRide(ride));
}));
app.get('/api/rides/:id/events',auth,wrap(async(req,res)=>{
 if(!objId(req.params.id))throw fail('Invalid ride id');
 const ride=await Ride.findById(req.params.id);
 if(!ride)throw fail('Ride not found',404);
 if(!await authorizeRide(req,ride))throw fail('Forbidden',403);
 res.json(await RideEvent.find({rideId:ride._id}).sort('happenedAt').lean());
}));
app.post('/api/rides/:id/offers/:offerId/respond',auth,roles('DRIVER'),wrap(async(req,res)=>{
 if(!objId(req.params.id)||!objId(req.params.offerId))throw fail('Invalid identifier');
 if(typeof req.body.accept!=='boolean')throw fail('accept must be boolean');
 res.json(await respondToOffer({rideId:req.params.id,offerId:req.params.offerId,driverUserId:req.auth.userId,accept:req.body.accept,io}));
}));
app.patch('/api/rides/:id/status',auth,roles('DRIVER'),wrap(async(req,res)=>{
 const expected={ARRIVING:'ACCEPTED',IN_PROGRESS:'ARRIVING',COMPLETED:'IN_PROGRESS'};
 const next=req.body.status;
 if(!expected[next])throw fail('Only ARRIVING, IN_PROGRESS, COMPLETED permitted');
 const driver=await Driver.findOne({userId:req.auth.userId});
 const updates={status:next};
 if(next==='IN_PROGRESS')updates.startedAt=current();
 if(next==='COMPLETED')updates.completedAt=current();
 const ride=await Ride.findOneAndUpdate({_id:req.params.id,driverId:driver?._id,status:expected[next]},{$set:updates},{new:true});
 if(!ride)throw fail('Invalid ride state transition or driver',409);
 if(next==='COMPLETED'){
  await Driver.updateOne({_id:driver._id,activeRideId:ride._id},{$set:{status:'AVAILABLE',activeRideId:null,idleSince:current(),currentWorkload:0},$inc:{completedRides:1}});
 }
 await RideEvent.create({rideId:ride._id,type:next,actor:'DRIVER',actorUserId:req.auth.userId});
 io.to(`ride:${ride._id}`).emit('ride:update',{status:next});
 res.json(publicRide(ride));
}));
app.post('/api/rides/:id/cancel',auth,roles('PASSENGER'),wrap(async(req,res)=>{
 const ride=await Ride.findOneAndUpdate({_id:req.params.id,passengerId:req.auth.userId,
  status:{$in:['REQUESTED','OFFERED','ACCEPTED','ARRIVING']}},{$set:{status:'CANCELLED',cancelledAt:current()}},{new:true});
 if(!ride)throw fail('Cannot cancel this ride',409);
 if(ride.activeOfferId)await RideOffer.updateOne({_id:ride.activeOfferId,status:'PENDING'},{$set:{status:'CANCELLED'}});
 if(ride.driverId)await releaseDriver(ride.driverId,ride._id);
 await RideEvent.create({rideId:ride._id,type:'CANCELLED',actor:'PASSENGER',actorUserId:req.auth.userId});
 io.to(`ride:${ride._id}`).emit('ride:update',{status:'CANCELLED'});
 res.json({status:'CANCELLED'});
}));

app.get('/api/intelligence/demand',auth,wrap(async(req,res)=>{
 const forecasts=await DemandPrediction.find(req.query.zoneCode?{zoneCode:req.query.zoneCode}:{})
   .sort({forecastFor:1}).limit(100).lean();
 res.json({model:'latest persisted forecasts',forecasts});
}));
app.get('/api/intelligence/history',auth,wrap(async(req,res)=>{
 const q=req.query.zoneCode?{zoneCode:req.query.zoneCode}:{};
 res.json(await DemandHistory.find(q).sort({bucketStart:-1}).limit(100).lean());
}));
app.get('/api/intelligence/surge',auth,wrap(async(req,res)=>{
 const zones=await Zone.find().lean();
 const latest=await Promise.all(zones.map(async z=>{
  const [pred,supply]=await Promise.all([
   DemandPrediction.findOne({zoneCode:z.code}).sort({forecastFor:1}).lean(),
   Driver.countDocuments({zoneCode:z.code,status:'AVAILABLE'})
  ]);
  const demand=pred?.predictedRequests??0;
  return {zoneCode:z.code,predictionAvailable:Boolean(pred),predictedRequests:demand,availableDrivers:supply,...surgeMultiplier(demand,supply)};
 }));
 res.json(latest);
}));
app.get('/api/intelligence/reposition',auth,wrap(async(req,res)=>{
 const zones=await Zone.find().lean();
 const metrics=[];
 for(const z of zones){
  const pred=await DemandPrediction.findOne({zoneCode:z.code,forecastFor:{$gte:new Date(Date.now()-3600000)}}).sort({forecastFor:1}).lean();
  const supply=await Driver.countDocuments({zoneCode:z.code,status:'AVAILABLE'});
  const demand=pred?.predictedRequests??null;
  // Demo policy only: assume one available driver can handle ~4 requests per hour.
  metrics.push({zoneCode:z.code,center:z.center,predictedRequests:demand,availableDrivers:supply,
   deficit:demand===null?null:Math.max(0,Math.ceil(demand/4)-supply),
   surplus:demand===null?null:Math.max(0,supply-Math.ceil(demand/4))});
 }
 const donors=metrics.filter(z=>(z.surplus??0)>0),targets=metrics.filter(z=>(z.deficit??0)>0);
 const suggestions=[];
 for(const target of targets.sort((a,b)=>b.deficit-a.deficit)){
  for(const donor of donors){
   if(target.deficit<=0)break;
   const move=Math.min(target.deficit,donor.surplus);
   if(move<=0)continue;
   suggestions.push({fromZone:donor.zoneCode,toZone:target.zoneCode,driverCount:move});
   target.deficit-=move;donor.surplus-=move;
  }
 }
 res.json({suggestions,metrics,mode:'SIMULATED_RECOMMENDATIONS_ONLY',assumedTripsPerDriverPerHour:4});
}));
app.post('/api/admin/pricing/refresh',auth,roles('ADMIN'),wrap(async(req,res)=>{
 const zones=await Zone.find().select('code').lean(),updated=[];
 for(const z of zones){
  const pred=await DemandPrediction.findOne({zoneCode:z.code,forecastFor:{$gte:new Date(Date.now()-3600000)}}).sort({forecastFor:1}).lean();
  if(!pred)continue;
  const supply=await Driver.countDocuments({zoneCode:z.code,status:'AVAILABLE'});
  const {ratio,multiplier}=surgeMultiplier(pred.predictedRequests,supply);
  const rec=await ZonePricing.create({zoneCode:z.code,calculatedAt:new Date(),predictedRequests:pred.predictedRequests,
   availableDrivers:supply,demandSupplyRatio:ratio,multiplier,source:'SIMULATION'});
  updated.push({zoneCode:z.code,multiplier,recordId:rec._id});
 }
 res.json({updated,source:'SYNTHETIC_FORECASTS',note:'No real Belagavi rides or prices are measured.'});
}));
app.post('/api/pooling/find',auth,roles('PASSENGER','ADMIN'),wrap(async(req,res)=>{
 const ride=await Ride.findById(req.body.rideId);
 if(!ride)throw fail('Ride not found',404);
 if(req.auth.role==='PASSENGER'&&String(ride.passengerId)!==req.auth.userId)throw fail('Forbidden',403);
 const rides=await Ride.find({source:'LIVE',poolingRequested:true,status:{$in:['REQUESTED','OFFERED']},_id:{$ne:ride._id}}).limit(100);
 const matches=rides.map(other=>({rideId:other._id,...poolingCompatible(ride,other)})).filter(x=>x.compatible);
 res.json({matches,caveat:'Compatibility pre-filter only; no pooled booking is created until route insertion is validated.'});
}));
app.get('/api/admin/summary',auth,roles('ADMIN'),wrap(async(req,res)=>{
 const [ridesByStatus,driversByStatus,offersByStatus]=await Promise.all([
  Ride.aggregate([{$group:{_id:'$status',count:{$sum:1}}}]),
  Driver.aggregate([{$group:{_id:'$status',count:{$sum:1}}}]),
  RideOffer.aggregate([{$group:{_id:'$status',count:{$sum:1}}}])
 ]);
 res.json({ridesByStatus,driversByStatus,offersByStatus,dataSources:'MIXED_LIVE_AND_SYNTHETIC_HISTORY'});
}));
app.post('/api/admin/matching/batch-preview',auth,roles('ADMIN'),wrap(async(req,res)=>{
 const rideIds=Array.isArray(req.body.rideIds)?req.body.rideIds.slice(0,20):[];
 const rides=await Ride.find({_id:{$in:rideIds},status:'REQUESTED',source:'LIVE'}).lean();
 const drivers=await Driver.find({status:'AVAILABLE',activeRideId:null,lastLocationAt:{$gte:new Date(Date.now()-300000)}}).limit(40).lean();
 if(!rides.length || !drivers.length)return res.json({assignments:[]});
 const costs=rides.map(r=>drivers.map(d=>d.vehicle.capacity<r.passengerCount?1e6:1-scoreDriver(d,r).score));
 const assignments=hungarian(costs).map(x=>({rideId:rides[x.row]._id,driverId:drivers[x.col]._id,score:+(1-costs[x.row][x.col]).toFixed(4)}));
 res.json({assignments,mode:'PREVIEW_ONLY',note:'Live dispatch uses atomic single-request offer workflow; this endpoint previews Hungarian batch optimization.'});
}));

io.use((socket,next)=>{
 try{
  const token=socket.handshake.auth?.token;
  const payload=jwt.verify(token,secret);
  socket.data.auth={userId:payload.sub,role:payload.role};next();
 }catch{next(new Error('Unauthorized socket'));}
});
io.on('connection',socket=>{
 socket.join(`user:${socket.data.auth.userId}`);
 socket.on('ride:watch',async(rideId,ack)=>{
  try{
   if(!objId(rideId))throw new Error('Invalid ride id');
   const ride=await Ride.findById(rideId);
   if(!ride)throw new Error('Ride not found');
   let allowed=socket.data.auth.role==='ADMIN'||String(ride.passengerId)===socket.data.auth.userId;
   if(!allowed&&ride.driverId){const driver=await Driver.findById(ride.driverId);allowed=String(driver?.userId)===socket.data.auth.userId;}
   if(!allowed)throw new Error('Forbidden');
   socket.join(`ride:${rideId}`);ack?.({ok:true});
  }catch(e){ack?.({ok:false,error:e.message});}
 });
});
app.use((err,req,res,next)=>{
 console.error('API error:',err.message);
 if(err.code===11000)return res.status(409).json({error:'Duplicate unique value'});
 if(err.name==='CastError'||err.name==='ValidationError')return res.status(400).json({error:'Invalid request data'});
 res.status(err.status||500).json({error:err.status?err.message:'Internal server error'});
});
await connectDB();
let expiryBusy=false;
setInterval(async()=>{
 if(expiryBusy)return;
 expiryBusy=true;try{await expireOffers(io);}catch(e){console.error('Offer-expiry worker:',e.message);}finally{expiryBusy=false;}
},5000).unref();
server.listen(Number(process.env.PORT||5000),()=>console.log(`RideSync API listening on ${process.env.PORT||5000}`));
