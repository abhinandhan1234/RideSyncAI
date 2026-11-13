import 'dotenv/config';
import http from 'node:http';
import app from './app.js';
import { connectDB } from './config/database.js';
import { expireOffers } from './services/matching/dispatch.js';
import {attachSockets} from './sockets/index.js';

const PORT = process.env.PORT || 5002;

const server = http.createServer(app);
const io=attachSockets(server,app);

await connectDB();
const timer=setInterval(()=>expireOffers(io).catch(console.error),1000);timer.unref();
server.listen(PORT, () => {
  console.log(`RideSync AI Backend listening on port ${PORT}`);
});

export default server;
