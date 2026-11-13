import 'dotenv/config';
import http from 'node:http';
import { createApp } from './app.js';
import { attachSockets } from './sockets/index.js';
import { expireOffers } from './services/matching/dispatch.js';
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
const io = attachSockets(server, app);
let expiring = false;
const expiryTimer = setInterval(async () => {
  if (expiring) return;
  expiring = true;
  try { await expireOffers(io); } catch { console.error('Authenticated offer expiry failed; retrying'); }
  finally { expiring = false; }
}, 1000);
expiryTimer.unref();

server.listen(PORT, () => {
  console.log(`RideSync AI Backend listening on port ${PORT}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
  stopWorker();
  clearInterval(expiryTimer);
  io.close();
  server.close(async () => { await mongoose.disconnect(); process.exit(0); });
});

export default server;
