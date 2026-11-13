import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import healthRouter from './routes/health.routes.js';
import { bookingRouter } from './routes/demo.routes.js';
import authenticatedRouter from './routes/booking.routes.js';
import { BookingService } from './services/booking.js';
import sarathiRouter, {adminRouter,webhookRouter} from './routes/sarathi.routes.js';
import {corsOrigin} from './config/client-origins.js';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export function createApp(service = new BookingService()) {
  const app = express();
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => console.info(`${req.method} ${req.route?.path || 'unmatched'} ${res.statusCode} ${Date.now()-start}ms`));
    next();
  });

  // Security headers
  app.use(helmet());

  app.use(cors({origin:corsOrigin,credentials:true}));

  const uploadDirectory=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../uploads');
  app.use('/uploads',express.static(uploadDirectory,{fallthrough:false,index:false,dotfiles:'deny',immutable:true,maxAge:'1d'}));

  app.use(express.json({limit:'3mb',verify:(req,_res,buffer)=>{req.rawBody=Buffer.from(buffer);}}));
  app.use('/api/webhooks',webhookRouter);

  // Body parsing
  app.use(express.json());

  // ── Routes ───────────────────────────────────────────────────────────────────
  app.use('/api/health', healthRouter);
  if (process.env.ENABLE_BOOKING_DEMO === 'true') app.use('/api/demo', bookingRouter(service));
  app.use('/api', authenticatedRouter);
  app.use('/api/sarathi',sarathiRouter);
  app.use('/api/admin',adminRouter);

  // ── 404 handler ──────────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Route not found' });
  });

  // ── Global error handler ─────────────────────────────────────────────────────
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = err.code === 11000 ? 409 : ['ValidationError','CastError'].includes(err.name) ? 400 : (err.status || err.statusCode || 500);
    const code = err.code === 11000 ? 'CONFLICT' : status >= 500 ? 'INTERNAL_ERROR' : typeof err.code === 'string' ? err.code : err.error || 'INVALID_REQUEST';
    const message = status >= 500 ? 'Internal server error' : err.code === 11000 ? 'Conflicting assignment' : (err.message || 'Invalid request data');
    res.status(status).json({ error: code, message });
  });

  return app;
}
export default createApp();
