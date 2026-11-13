/**
 * Usage: npm run import:starter -- ../data-starter
 * Reads the four specified files. Fails clearly on schema mismatches; never treats synthetic values as observed.
 * CSV column aliases can be extended in the pick() calls below once your real starter ZIP is attached.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {parse} from 'csv-parse/sync';
import {connectDB} from '../src/db.js';
import {User,Driver,Zone,Ride,DemandHistory,SimulationRun,point} from '../src/models.js';
const dir=path.resolve(process.argv[2]||'../data-starter');
const names=['zones_demo.json','drivers_simulated.csv','historical_demand_simulated.csv','ride_requests_simulated.csv'];
for(const name of names)if(!fs.existsSync(path.join(dir,name)))throw new Error(`Missing ${path.join(dir,name)}. Extract your starter ZIP first.`);
const readCSV=(name)=>parse(fs.readFileSync(path.join(dir,name),'utf8'),{columns:true,skip_empty_lines:true,bom:true,trim:true});
const normalize=(key)=>String(key).toLowerCase().replace(/[^a-z0-9]/g,'');
function pick(row,...keys){const vals=Object.fromEntries(Object.entries(row).map(([k,v])=>[normalize(k),v]));
 for(const k of keys){const v=vals[normalize(k)];if(v!==undefined&&v!==null&&String(v).trim()!=='')return v;}return null;
}
function num(v){if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;}
function lonlat(row,prefix){
 const lat=num(pick(row,`${prefix}_lat`,`${prefix}_latitude`,`${prefix}Lat`,`${prefix}Latitude`, ...(prefix==='current'?['latitude','lat']:[])));
 const lng=num(pick(row,`${prefix}_lng`,`${prefix}_lon`,`${prefix}_longitude`,`${prefix}Lng`,`${prefix}Lon`,`${prefix}Longitude`,...(prefix==='current'?['longitude','lng','lon']:[])));
 if(lat===null||lng===null||Math.abs(lat)>90||Math.abs(lng)>180)return null;
 return point(lng,lat);
}
function dateOrNull(v){
 if(v===null||v===undefined||String(v).trim()==='')return null;
 let s=String(v).trim();
 if(/^\d{4}-\d{2}-\d{2}$/.test(s))s+='T00:00:00+05:30';
 else if(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?$/.test(s))s=s.replace(' ','T')+'+05:30';
 const d=new Date(s);return Number.isNaN(d.valueOf())?null:d;
}
function hourDate(row){
 const direct=dateOrNull(pick(row,'bucket_start','timestamp','datetime','requested_at','request_time','pickup_datetime','created_at','date_time'));
 if(direct)return direct;
 const day=pick(row,'date','service_date','day'),hour=num(pick(row,'hour','hour_of_day','local_hour'));
 if(!day)return null;
 const base=String(day).slice(0,10), hh=Number.isInteger(hour)?String(hour).padStart(2,'0'):'00';
 return dateOrNull(`${base}T${hh}:00:00+05:30`);
}
const hash=(s)=>crypto.createHash('sha1').update(s).digest('hex').slice(0,20);
const slug=(s)=>String(s).trim().replace(/\s+/g,'_').toUpperCase();
function zoneOf(r,...names){return slug(pick(r,...names)||'');}
function dayHourIST(d){const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23',weekday:'short'}).formatToParts(d).map(x=>[x.type,x.value]));
 return {hour:Number(p.hour),day:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(p.weekday)};
}
const counts={zones:0,drivers:0,passengers:0,rides:0,demandHistory:0,skippedRides:0,skippedDemand:0};
await connectDB();
try {
 const parsed=JSON.parse(fs.readFileSync(path.join(dir,'zones_demo.json'),'utf8'));
 const zoneItems=Array.isArray(parsed)?parsed:(parsed.zones||parsed.features||[]);
 if(!zoneItems.length)throw new Error('No zones in zones_demo.json; expected array, {zones:[...]}, or GeoJSON FeatureCollection.');
 const zoneLookups=new Map();
 for(let i=0;i<zoneItems.length;i++){
  const raw=zoneItems[i],z=raw.properties??raw;
  const code=zoneOf(z,'code','zone_code','zone_id','id','name')||`Z${i+1}`;
  const name=String(pick(z,'name','zone_name','label')||code);
  const coords=(raw.geometry?.type==='Point'?raw.geometry.coordinates:null)||(raw.center?.coordinates??null);
  const lat=num(pick(z,'center_lat','latitude','lat')??z.center?.lat??(coords?.[1]));
  const lng=num(pick(z,'center_lon','center_lng','longitude','lon','lng')??z.center?.lng??(coords?.[0]));
  if(lat===null||lng===null)throw new Error(`Zone ${code} missing center coordinates; update importer to match actual JSON.`);
  await Zone.updateOne({code},{$set:{name,center:point(lng,lat),radiusKm:num(pick(z,'radius_km','radiusKm'))||2,
    source:'DEMO',boundaryVerified:false}},{upsert:true});
  for(const k of [code,String(pick(z,'zone_id','id')||''),name])if(k)zoneLookups.set(slug(k),code);
  counts.zones++;
 }
 const zones=await Zone.find().lean(),zoneByCode=new Map(zones.map(z=>[z.code,z]));
 function resolveZone(raw){return zoneLookups.get(slug(raw||''))|| (zoneByCode.has(slug(raw||''))?slug(raw):null);}
 const demoPassword=process.env.DEMO_PASSWORD||'DemoPass123!';
 const passwordHash=await bcrypt.hash(demoPassword,10);
 const passengerOps=Array.from({length:500},(_,i)=>({updateOne:{filter:{email:`passenger${String(i+1).padStart(3,'0')}@ridesync.demo`},
   update:{$setOnInsert:{displayName:`Demo Passenger ${i+1}`,email:`passenger${String(i+1).padStart(3,'0')}@ridesync.demo`,role:'PASSENGER',passwordHash,isSynthetic:true}},upsert:true}}));
 await User.bulkWrite(passengerOps,{ordered:false});
 const passengers=await User.find({email:/^passenger\d+@ridesync\.demo$/}).sort('email').select('_id').lean();
 counts.passengers=passengers.length;
 const driversCSV=readCSV('drivers_simulated.csv');
 const driverUserOps=[];
 for(let i=0;i<driversCSV.length;i++){
  const r=driversCSV[i];const src=String(pick(r,'driver_id','id','driverId')||`D${i+1}`);
  const email=`driver-${hash(src)}@ridesync.demo`;
  driverUserOps.push({updateOne:{filter:{email},update:{$setOnInsert:{email,displayName:`Demo Driver ${src}`,passwordHash,role:'DRIVER',isSynthetic:true}},upsert:true}});
 }
 await User.bulkWrite(driverUserOps,{ordered:false});
 for(let i=0;i<driversCSV.length;i++){
  const r=driversCSV[i],src=String(pick(r,'driver_id','id','driverId')||`D${i+1}`);
  const user=await User.findOne({email:`driver-${hash(src)}@ridesync.demo`}).select('_id');
  const location=lonlat(r,'current')||lonlat(r,'location');
  if(!location)throw new Error(`drivers_simulated.csv row ${i+1} lacks current lat/lon; columns found: ${Object.keys(r).join(', ')}`);
  const zoneCode=resolveZone(pick(r,'zone_id','zone_code','zone','current_zone'));
  if(!zoneCode)throw new Error(`Unknown zone in driver row ${i+1}; got ${pick(r,'zone_id','zone_code','zone','current_zone')}`);
  const rawType=String(pick(r,'vehicle_type','vehicle','type')||'CAR').toUpperCase();
  const vehicleType=rawType.includes('BIKE')||rawType.includes('TWO')?'BIKE':rawType.includes('AUTO')?'AUTO':'CAR';
  const capacity=num(pick(r,'capacity','seats'))??(vehicleType==='BIKE'?1:vehicleType==='AUTO'?3:4);
  const rate=num(pick(r,'acceptance_rate','acceptanceRate'));
  const acceptanceRate=rate===null?.85:Math.max(0,Math.min(1,rate>1?rate/100:rate));
  await Driver.updateOne({userId:user._id},{$set:{externalId:src,vehicle:{type:vehicleType,plate:String(pick(r,'vehicle_number','plate')||`DEMO-${src}`),capacity},
    location,zoneCode,status:'AVAILABLE',activeRideId:null,idleSince:new Date(),lastLocationAt:new Date(),acceptanceRate}},{upsert:true});
  counts.drivers++;
 }
 const demandRows=readCSV('historical_demand_simulated.csv'),demandOps=[];
 for(let i=0;i<demandRows.length;i++){
  const r=demandRows[i],zoneCode=resolveZone(pick(r,'zone_code','zone_id','zone','zone_name'));
  const bucketStart=hourDate(r),requests=num(pick(r,'request_count','demand_count','ride_requests','requests','demand','ride_count'));
  if(!zoneCode||!bucketStart||requests===null){counts.skippedDemand++;if(i<3)console.warn('Unmapped demand row',i+1,Object.keys(r));continue;}
  const {hour,day}=dayHourIST(bucketStart),sourceKey=`starter:${zoneCode}:${bucketStart.toISOString()}`;
  demandOps.push({updateOne:{filter:{sourceKey},update:{$set:{zoneCode,bucketStart,localHour:hour,localDayOfWeek:day,requestCount:Math.max(0,Math.round(requests)),
    availableDrivers:Math.max(0,Math.round(num(pick(r,'available_drivers','supply','drivers_available'))||0)),
    averageWaitMin:num(pick(r,'avg_wait_min','average_wait_minutes','average_wait_min')),source:'SYNTHETIC',simulationRun:'starter-pack'}},upsert:true}});
 }
 for(let i=0;i<demandOps.length;i+=500)await DemandHistory.bulkWrite(demandOps.slice(i,i+500),{ordered:false});
 counts.demandHistory=demandOps.length;
 const ridesCSV=readCSV('ride_requests_simulated.csv'),rideOps=[];
 for(let i=0;i<ridesCSV.length;i++){
  const r=ridesCSV[i],pickup=lonlat(r,'pickup')||lonlat(r,'origin'),dropoff=lonlat(r,'dropoff')||lonlat(r,'drop')||lonlat(r,'destination');
  const pickupZoneCode=resolveZone(pick(r,'pickup_zone','pickup_zone_id','origin_zone','source_zone','pickup_zone_code'));
  const dropoffZoneCode=resolveZone(pick(r,'drop_zone','dropoff_zone','destination_zone','destination_zone_id','drop_zone_id'));
  const requestedAt=hourDate(r);
  if(!pickup||!dropoff||!pickupZoneCode||!dropoffZoneCode||!requestedAt){
    counts.skippedRides++;
    if(i<3)console.warn(`Unmapped ride row ${i+1}:`,Object.keys(r));
    continue;
  }
  const sourceId=String(pick(r,'ride_id','request_id','trip_id','id')||`csv-row-${i+1}`);
  const rawStatus=String(pick(r,'status','ride_status')||'').toUpperCase();
  const status=['COMPLETED','CANCELLED','FAILED'].includes(rawStatus)?rawStatus:'HISTORICAL_UNKNOWN';
  const passengerId=passengers[i%passengers.length]?._id;
  const distanceKm=num(pick(r,'distance_km','trip_distance_km','estimated_distance_km'))||0;
  const fareAmount=num(pick(r,'fare','fare_inr','estimated_fare'))||0;
  const details={CSVrow:i+1,statusInCSV:rawStatus||null,geoSource:'SOURCE_CSV',hasObservedFare:fareAmount>0};
  rideOps.push({updateOne:{filter:{sourceId:`starter:${sourceId}`},update:{$set:{passengerId,source:'SYNTHETIC_HISTORY',pickup,dropoff,
    pickupZoneCode,dropoffZoneCode,status,requestedAt,distanceKm,
    fare:{base:0,distance:0,time:0,surge:1,total:fareAmount,currency:'INR'},metadata:details}},upsert:true}});
 }
 for(let i=0;i<rideOps.length;i+=500)await Ride.bulkWrite(rideOps.slice(i,i+500),{ordered:false});
 counts.rides=rideOps.length;
 await SimulationRun.updateOne({label:'starter-pack'},{$set:{seed:20261113,dataSource:'SYNTHETIC',sourceFilenames:names,counts,notes:'Imported from user starter datasets. DEMO zone centers are not validated administrative boundaries.'}},{upsert:true});
 console.log('Import summary:',JSON.stringify(counts,null,2));
 if(counts.skippedRides||counts.skippedDemand){console.error('WARNING: Some rows could not be mapped. Extend column aliases and rerun.');process.exitCode=2;}
}finally{await mongoose.disconnect();}
