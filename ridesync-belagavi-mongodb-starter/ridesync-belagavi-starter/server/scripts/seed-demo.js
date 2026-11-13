/** Self-contained smoke-test data. Not based on observed Belagavi ride demand or validated roads. */
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {connectDB} from '../src/db.js';
import {User,Driver,Zone,Ride,DemandHistory,SimulationRun,point} from '../src/models.js';
let seed=20261113;
const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
const center=[74.4977,15.8497]; // approximate city anchor for demo only, not an official location reference
const zones=Array.from({length:8},(_,i)=>{
 const a=2*Math.PI*i/8;
 return {code:`DEMO-Z${i+1}`,name:`Demo Sector ${i+1}`,
  center:point(center[0]+0.032*Math.cos(a),center[1]+0.026*Math.sin(a)),
  source:'DEMO',radiusKm:2.5,boundaryVerified:false};
});
const randomNear=(p,scale=.010)=>point(p.coordinates[0]+(rand()-.5)*scale,p.coordinates[1]+(rand()-.5)*scale);
const hash=await bcrypt.hash(process.env.DEMO_PASSWORD||'DemoPass123!',10);
await connectDB();
try{
 for(const z of zones)await Zone.updateOne({code:z.code},{$set:z},{upsert:true});
 const admin=await User.findOneAndUpdate({email:'admin@ridesync.demo'},{$setOnInsert:{displayName:'Demo Admin',email:'admin@ridesync.demo',passwordHash:hash,role:'ADMIN',isSynthetic:true}},{upsert:true,new:true});
 const passengers=[];
 for(let i=1;i<=100;i++){
  const email=`passenger${String(i).padStart(3,'0')}@ridesync.demo`;
  const u=await User.findOneAndUpdate({email},{$setOnInsert:{displayName:`Demo Passenger ${i}`,email,passwordHash:hash,role:'PASSENGER',isSynthetic:true}},{upsert:true,new:true});
  passengers.push(u);
 }
 for(let i=1;i<=40;i++){
  const z=zones[i%zones.length],email=`driver${String(i).padStart(3,'0')}@ridesync.demo`;
  const user=await User.findOneAndUpdate({email},{$setOnInsert:{displayName:`Demo Driver ${i}`,email,passwordHash:hash,role:'DRIVER',isSynthetic:true}},{upsert:true,new:true});
  await Driver.updateOne({userId:user._id},{$set:{userId:user._id,externalId:`SMOKE-D${i}`,location:randomNear(z.center),zoneCode:z.code,
    vehicle:{type:i%5===0?'AUTO':i%6===0?'BIKE':'CAR',plate:`DEMO-${i}`,capacity:i%5===0?3:i%6===0?1:4},
    status:'AVAILABLE',activeRideId:null,idleSince:new Date(Date.now()-(i*3*60000)),lastLocationAt:new Date(),
    acceptanceRate:+(0.65+rand()*.33).toFixed(2)}},{upsert:true});
 }
 const today=new Date(), ops=[],totalDays=28;
 for(let day=totalDays;day>=1;day--){
  for(let h=0;h<24;h++){
   const ist=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate()-day,h,0)-330*60000);
   const dow=Number(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kolkata',weekday:'short'}).format(ist).replace(/.*/,m=>({Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}[m])));
   for(const [i,z] of zones.entries()){
    const peak=((h>=7&&h<=10)||(h>=17&&h<=20))?3:1;
    const weekend=(dow===0||dow===6)?0.80:1;
    const reqs=Math.round((3+(i%3)*1.5)*peak*weekend*(0.70+rand()*.6));
    const sourceKey=`smoke:${z.code}:${ist.toISOString()}`;
    ops.push({updateOne:{filter:{sourceKey},update:{$set:{zoneCode:z.code,bucketStart:ist,localHour:h,
      localDayOfWeek:dow,requestCount:reqs,availableDrivers:Math.round(2+rand()*8),
      averageWaitMin:+(3+rand()*8).toFixed(1),source:'SYNTHETIC',simulationRun:'smoke-demo'}},upsert:true}});
   }
  }
 }
 for(let i=0;i<ops.length;i+=500)await DemandHistory.bulkWrite(ops.slice(i,i+500));
 // A few marked synthetic historical rides for dashboard smoke tests.
 for(let i=0;i<200;i++){
  const z=zones[i%8],to=zones[(i+2)%8];
  await Ride.updateOne({sourceId:`smoke-${i}`},{$set:{sourceId:`smoke-${i}`,source:'SYNTHETIC_HISTORY',passengerId:passengers[i%passengers.length]._id,
   pickup:randomNear(z.center),dropoff:randomNear(to.center),pickupZoneCode:z.code,dropoffZoneCode:to.code,
   requestedAt:new Date(Date.now()-(i+2)*3600000),status:'HISTORICAL_UNKNOWN',metadata:{synthetic:true,roadSnapped:false}}},{upsert:true});
 }
 await SimulationRun.updateOne({label:'smoke-demo'},{$set:{label:'smoke-demo',seed:20261113,dataSource:'SYNTHETIC',
  counts:{zones:zones.length,drivers:40,passengers:100,hourlyDemand:ops.length,syntheticRides:200},
  notes:'Fallback fixtures generated on approximate coordinates. Replace with user starter ZIP and OSM roads.'}},{upsert:true});
 console.log('Smoke seed ready:',{zones:8,drivers:40,passengers:100,demand:ops.length,historyRides:200});
 console.log('Demo logins: passenger001@ridesync.demo, driver001@ridesync.demo, admin@ridesync.demo');
 console.log('Demo password:',process.env.DEMO_PASSWORD||'DemoPass123!','(development only)');
}finally{await mongoose.disconnect();}
