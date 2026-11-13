# RideSync AI Backend

The Express.js API server powering RideSync AI — an intelligent ride-sharing platform for Belagavi with real-time dispatch, demand forecasting, eco-routing, and ride-pooling.

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ (ESM) |
| Framework | Express 4 |
| Database | MongoDB via Mongoose 8 |
| Real-time | Socket.IO 4 |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Security | Helmet, CORS, express-rate-limit |
| Environment | dotenv |

---

## Project Structure

```
backend/
├── src/
│   ├── app.js                  # Express app factory (middleware + routes)
│   ├── server.js               # HTTP server entry-point
│   ├── config/
│   │   └── database.js         # MongoDB connection helper (connectDB)
│   ├── routes/
│   │   └── health.routes.js    # GET /api/health
│   ├── controllers/            # Route handlers (to be added)
│   ├── models/                 # Mongoose models (to be added)
│   ├── middleware/             # Auth, rate-limit, error middleware (to be added)
│   ├── services/
│   │   ├── matching/           # Driver-matching logic
│   │   ├── pooling/            # Ride-pool insertion heuristic
│   │   ├── forecasting/        # Demand prediction integration
│   │   ├── routing/            # OSMnx / route comparison calls
│   │   └── reassignment/       # Automatic reassignment state machine
│   ├── sockets/                # Socket.IO event handlers
│   └── utils/                  # Shared utilities
├── tests/
│   └── health.test.js          # Node built-in test runner
├── scripts/                    # One-off admin / seed scripts
├── .env.example                # Environment variable template
├── package.json
└── README.md
```

---

## Getting Started

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and set your real values (see Environment Variables below)
```

### 3. Start development server

```bash
npm run dev
```

The server starts with `node --watch` for automatic restarts on file changes. You should see:

```
RideSync AI Backend listening on port 5002
```

### 4. Start production server

```bash
npm start
```

---

## Health Check

Once running, verify the server is up:

```bash
curl http://localhost:5002/api/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "RideSync AI Backend",
  "timestamp": "2026-11-13T07:42:00.000Z"
}
```

---

## Running Tests

```bash
npm test
```

Uses Node's built-in test runner (`node:test`). The health tests spin up the app on a random port and do **not** require a live MongoDB connection.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5002` | TCP port the HTTP server listens on |
| `MONGODB_URI` | *(required when connecting DB)* | Full MongoDB connection string |
| `JWT_SECRET` | *(required for auth)* | Secret key ≥ 32 characters for signing JWTs |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed CORS origin (Vite dev server) |
| `NODE_ENV` | `development` | `development` or `production` |

> **Never commit your `.env` file.** It is listed in `.gitignore`. Only `.env.example` is tracked.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Liveness check — no DB required |

Additional routes (auth, rides, drivers, predictions, etc.) will be added as services are implemented. See [`docs/API_CONTRACTS.md`](../docs/API_CONTRACTS.md) for the full planned API surface.

---

## Connecting to MongoDB

MongoDB is **not** connected automatically when the server starts. Call `connectDB()` explicitly in the entry-point that needs it:

```js
import { connectDB } from './src/config/database.js';

await connectDB();
```

This keeps the health endpoint functional even when MongoDB is unavailable during development.
