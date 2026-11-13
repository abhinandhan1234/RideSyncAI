import 'dotenv/config';
import http from 'node:http';
import app from './app.js';

const PORT = process.env.PORT || 5002;

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`RideSync AI Backend listening on port ${PORT}`);
});

export default server;
