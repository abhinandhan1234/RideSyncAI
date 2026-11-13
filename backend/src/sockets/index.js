import jwt from 'jsonwebtoken';
import {Server} from 'socket.io';
import {Ride,Driver} from '../models/index.js';
import {corsOrigin} from '../config/client-origins.js';

export function attachSockets(server,app){
 const io=new Server(server,{cors:{origin:corsOrigin,credentials:true}});
 app.set('io',io);
 io.use((socket,next)=>{
  try{socket.data.user=jwt.verify(socket.handshake.auth.token,process.env.JWT_SECRET);next();}
  catch{next(new Error('Unauthorized'));}
 });
 io.on('connection',socket=>{
  socket.join(`user:${socket.data.user.sub}`);
  socket.on('ride:join',async rideId=>{
   if(typeof rideId!=='string'||!/^[0-9a-f]{24}$/i.test(rideId))return;
   const ride=await Ride.findById(rideId).select('passengerId driverId poolMember');
   const driver=socket.data.user.role==='DRIVER'&&await Driver.findOne({userId:socket.data.user.sub}).select('_id');
   if(ride&&(String(ride.passengerId)===socket.data.user.sub||String(ride.poolMember)===socket.data.user.sub||(driver&&String(ride.driverId)===String(driver._id))))socket.join(`ride:${rideId}`);
  });
 });
 return io;
}
