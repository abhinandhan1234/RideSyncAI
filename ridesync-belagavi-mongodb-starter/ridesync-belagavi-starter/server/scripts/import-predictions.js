import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';
import {connectDB} from '../src/db.js';
import {DemandPrediction} from '../src/models.js';
const fp=path.resolve(process.argv[2]||'../python/predictions.json');
const rows=JSON.parse(fs.readFileSync(fp,'utf8'));
await connectDB();
try{
 for(const p of rows){
  await DemandPrediction.updateOne({zoneCode:p.zoneCode,forecastFor:new Date(p.forecastFor),modelVersion:p.modelVersion},
   {$set:{zoneCode:p.zoneCode,forecastFor:new Date(p.forecastFor),modelVersion:p.modelVersion,
    predictedRequests:Math.max(0,p.predictedRequests),trainingDataSource:'SYNTHETIC',generatedAt:new Date()}},{upsert:true});
 }
 console.log('Imported predictions:',rows.length);
}finally{await mongoose.disconnect();}
