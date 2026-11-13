import 'dotenv/config';
import http from 'node:http';
import { createApp } from './app.js';
import mongoose from 'mongoose';
import { connectDB } from './config/database.js';
import { initializeBookingModels } from './models/booking.js';
import { BookingService, startBookingWorker } from './services/booking.js';

await connectDB();
const hello = await mongoose.connection.db.admin().command({ hello: 1 });
if (!hello.setName && hello.msg !== 'isdbgrid') {
  await mongoose.disconnect();
  throw new Error('Booking requires MongoDB replica set or Atlas for atomic transactions');
}
await initializeBookingModels();
const service = new BookingService();
const app = createApp(service);
const stopWorker = startBookingWorker(service);

const PORT = process.env.PORT || 5002;

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`RideSync AI Backend listening on port ${PORT}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
  stopWorker();
  server.close(async () => { await mongoose.disconnect(); process.exit(0); });
});

export default server;
