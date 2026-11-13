// Fixed loopback destination. No caller-supplied URI or cleanup operation.
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Driver, Zone } from '../src/models/index.js';

const uri='mongodb://127.0.0.1:27183/intellimarg_demo?replicaSet=intellimargDemo';
if(process.env.NODE_ENV==='production') throw Error('Development only');
const accounts=[
  ['Yatri','PASSENGER',process.env.DEMO_YATRI_PASSWORD],
  ['Sarathi','DRIVER',process.env.DEMO_SARATHI_PASSWORD]
];
if(accounts.some(([, ,password])=>!password || password.length<12)) throw Error('Supply both demo passwords (12 characters minimum)');
try {
  await mongoose.connect(uri,{serverSelectionTimeoutMS:5000});
  const location={type:'Point',coordinates:[74.5,15.85]};
  await Zone.updateOne({code:'Z01'},{$setOnInsert:{name:'Synthetic demo zone',center:location}},{upsert:true});
  for(const [name,role,password] of accounts){
    const email=name.toLowerCase()+'@example.invalid';
    const user=await User.findOneAndUpdate({email,role,isSynthetic:true},{$setOnInsert:{
      displayName:'Demo '+name,passwordHash:await bcrypt.hash(password,12)
    }},{upsert:true,new:true,timestamps:false});
    if(role==='DRIVER')await Driver.updateOne({userId:user.id,externalId:'INTELLIMARG-DEMO'},{$setOnInsert:{
      location,locationSource:'SYNTHETIC',zoneCode:'Z01',status:'AVAILABLE',vehicle:{type:'CAR',capacity:4}
    }},{upsert:true,timestamps:false});
  }
  console.log('Demo accounts present. Existing credentials and driver state preserved.');
} finally {await mongoose.disconnect();}
