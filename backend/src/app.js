import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import healthRouter from './routes/health.routes.js';
import bookingRouter from './routes/booking.routes.js';

const app = express();

// Security headers
app.use(helmet());

// CORS — allow the configured client origin
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

// Body parsing
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api', bookingRouter);

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Route not found' });
});

// ── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ error: err.error || 'INTERNAL_ERROR', message });
});

export default app;
