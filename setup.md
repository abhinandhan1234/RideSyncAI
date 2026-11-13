# RideSync AI (Belagavi) — Project Setup & Run Guide

This document contains all the commands and configuration steps required to start the database, initialize demo data, run the backend server, and execute offline AI/geospatial tooling.

---

## 1. Prerequisites

- **Node.js**: v18+ (tested with Node v22)
- **MongoDB**: v6.0+ (MongoDB v7.0.5 installed and configured locally)
- **Python**: 3.10+ (optional, for demand forecasting & OSM routing tools)

---

## 2. Running MongoDB Database

MongoDB is installed and configured on your system.

### A. Start MongoDB (Native Daemon)

To start MongoDB in the background:

```bash
# Create data and log directories (if not already created)
mkdir -p ~/.local/share/mongodb/data ~/.local/share/mongodb/log

# Start mongod process in the background
mongod --dbpath ~/.local/share/mongodb/data --logpath ~/.local/share/mongodb/log/mongod.log --fork
```

### B. Verify MongoDB is Running

Check that MongoDB is actively listening on port `27017`:

```bash
lsof -i :27017
```

Expected output:
```text
COMMAND   PID   USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
mongod  11913 gaganh   11u  IPv4 0x2d7906217bcfe065      0t0  TCP localhost:27017 (LISTEN)
```

### C. Stop MongoDB

When you need to shut down the database server:

```bash
pkill mongod
```

### D. Alternative (Docker)

If you prefer to run MongoDB via Docker container:

```bash
docker run -d --name mongodb -p 27017:27017 --restart unless-stopped mongo:7
```

---

## 3. Environment Configuration

The environment file is configured at `ridesync-belagavi-starter/server/.env`:

```env
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/ridesync_belagavi
JWT_SECRET=ridesync_belagavi_super_secret_jwt_key_2026_hackvalley_route_secure
CLIENT_ORIGIN=http://localhost:5173
DEMO_PASSWORD=DemoPass123!
MAX_ASSIGNMENT_ATTEMPTS=4
RIDE_OFFER_TIMEOUT_SECONDS=20
```

> **Note on Port 5001**: On macOS, port `5000` is reserved by default for the AirPlay Receiver (ControlCenter). Port `5001` is configured to prevent port collision (`EADDRINUSE`).

---

## 4. Install Dependencies & Seed Database

Navigate to the `server` directory:

```bash
cd ridesync-belagavi-starter/server
```

### Install NPM Packages

```bash
npm install
```

### Seed Synthetic Smoke-Test Fixtures

Populates 8 Belagavi demo zones, 40 drivers, 100 passengers, 5,376 hourly demand records, and 200 synthetic history trips:

```bash
npm run seed:demo
```

### Validate Database Collections & Indexes

Verifies 2dsphere geospatial indexing, timestamps, and referential integrity:

```bash
npm run validate:data
```

### Run Algorithm Unit Tests

Runs dispatch, allocation, and matching algorithm checks:

```bash
node scripts/test-algorithms.js
```

---

## 5. Start the Backend API Server

Navigate to the server directory:

```bash
cd ridesync-belagavi-starter/server
```

### Development Mode (with automatic file reload)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

The server will be reachable at `http://localhost:5001`.

---

## 6. Verify API Endpoints & Authentication

### Health Check

```bash
curl -s http://localhost:5001/api/health
```

Expected response:
```json
{"ok":true,"service":"ridesync-belagavi","database":"connected"}
```

### Demo Logins

All demo accounts share the password: `DemoPass123!`

- **Passenger**: `passenger001@ridesync.demo`
- **Driver**: `driver001@ridesync.demo`
- **Admin**: `admin@ridesync.demo`

#### Test Login:

```bash
curl -s -X POST http://localhost:5001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"passenger001@ridesync.demo","password":"DemoPass123!"}'
```

#### Test Ride Request:

```bash
curl -s -X POST http://localhost:5001/api/rides \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <TOKEN_RETURNED_FROM_LOGIN>' \
  -d '{
    "pickup": {"lat": 15.8497, "lng": 74.4977},
    "dropoff": {"lat": 15.8600, "lng": 74.5100},
    "pickupZoneCode": "DEMO-Z1",
    "dropoffZoneCode": "DEMO-Z2",
    "passengerCount": 1,
    "poolingRequested": false
  }'
```

---

## 7. Python Forecasting & OSM Pipelines (Optional)

To train demand forecasting models or compute real road network distances:

```bash
cd ridesync-belagavi-starter

# 1. Setup virtual environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r python/requirements.txt

# 2. Extract OSM road graph for Belagavi (offline)
python python/extract_osm.py --out data/osm

# 3. Export demand history from MongoDB to CSV
node server/scripts/export-demand.js python/demand_history_export.csv

# 4. Train gradient-boosting demand forecasting model
python python/train_demand.py --csv python/demand_history_export.csv --out python

# 5. Import predictions back to MongoDB
node server/scripts/import-predictions.js python/predictions.json
```

