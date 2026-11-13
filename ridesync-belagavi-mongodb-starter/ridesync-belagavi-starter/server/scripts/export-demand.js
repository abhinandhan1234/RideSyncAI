import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';
import {connectDB} from '../src/db.js';
import {DemandHistory} from '../src/models.js';
const destination=path.resolve(process.argv[2]||'../python/demand_history_export.csv');
await connectDB();
try{
 const docs=await DemandHistory.find().sort({bucketStart:1,zoneCode:1}).lean();
 const headers=['zone_code','bucket_start','local_hour','local_day_of_week','request_count','available_drivers'];
 const esc=x=>`"${String(x??'').replaceAll('"','""')}"`;
 const lines=[headers.join(',')];
 for(const x of docs)lines.push([x.zoneCode,x.bucketStart.toISOString(),x.localHour,x.localDayOfWeek,x.requestCount,x.availableDrivers].map(esc).join(','));
 fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,lines.join('\n')+'\n');
 console.log(`Exported ${docs.length} demand rows to ${destination}`);
}finally{await mongoose.disconnect();}
