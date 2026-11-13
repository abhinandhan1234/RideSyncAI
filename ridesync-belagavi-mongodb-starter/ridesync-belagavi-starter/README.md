# RideSync AI — Belagavi: MongoDB + Express starter

This is a **backend-first implementable starter**, not a complete ride-hailing product. It includes 13 MongoDB/Mongoose collections, REST + Socket.IO core flows, basic driver allocation, timeout/reassignment, synthetic data import, a smoke-test seed, geospatial OSM extraction, and a Python forecasting pipeline.

## What is actually included vs not included

- INCLUDED: working source code for Mongoose models and geospatial indexes; JWT passenger/driver/admin login; ride request; driver availability; accept/reject; reassignment; ride status transitions; admin stats; preview-only Hungarian batch scoring and ride-pooling compatibility; import/validation scripts.
- INCLUDED: Python offline tools for OSM graph / POI extraction, GraphML road-distance computation, and gradient-boosting forecasting.
- NOT INCLUDED: user's actual `Belagavi PS2 Data Starter Pack` CSV/JSON files (not provided in the current working session), verified KGIS polygons, a React frontend, an initialized MongoDB service, a trained model, accurate traffic ETAs, or production-ready financial processing.
- WARNING: fallback seed uses approximate demo coordinates and simulated demand, not observed traffic or operational zone boundaries.

## 1. Start MongoDB

Requires a running MongoDB instance. For MongoDB Atlas, obtain a `mongodb+srv://...` URI. For local MongoDB, use localhost (see `server/.env.example`). A MongoDB replica set is recommended if you later add multi-document ACID transactions.

## 2. Backend setup

```bash
cd server
npm install
cp .env.example .env
# Edit .env: provide actual Mongo URI and set a strong random JWT_SECRET
npm run seed:demo
npm run validate:data
npm run dev
```

On Windows PowerShell use `Copy-Item .env.example .env`.

Synthetic smoke-test accounts (password = `DEMO_PASSWORD` in `.env`):

- `passenger001@ridesync.demo`
- `driver001@ridesync.demo`
- `admin@ridesync.demo`

**Do not expose demo accounts or passwords on a public deployment.**

## 3. Import the existing user CSV + JSON starter pack

Unzip the existing starter pack (not included here) into `data-starter/` inside the parent folder, so it contains:

```
data-starter/
  zones_demo.json
  drivers_simulated.csv
  historical_demand_simulated.csv
  ride_requests_simulated.csv
```

Then:

```bash
cd server
npm run import:starter -- ../data-starter
npm run validate:data
```

The importer uses alias mapping for common columns. It **cannot guarantee a perfect import without inspecting the actual column headers**. If it skips records, it reports the source columns; add the exact aliases in `scripts/import-starter.js`, then rerun. It upserts source IDs to avoid duplicating already-imported records.

Historical trip requests with no outcome field become `HISTORICAL_UNKNOWN` rather than fabricated completed trips. They cannot enter the live matching queue. Zone centers are kept as `boundaryVerified=false` until external polygons are checked.

## 4. OSM roads and POIs (optional separate offline job)

```bash
cd ..
python -m venv .venv
# Activate .venv for your operating system
pip install -r python/requirements.txt
python python/extract_osm.py --out data/osm
```

Outputs `belagavi_roads.graphml`, `belagavi_pois.csv`, and `study_area_only.geojson`. This script **does not** fabricate or validate the 8-zone KGIS boundary polygons. Once you have a credible KGIS source file, confirm geometry/projection, simplify if necessary, map each zone `code`, and import GeoJSON Polygon/MultiPolygon to `zones.geometry`.

Routing example:

```bash
python python/route_distance.py --graph data/osm/belagavi_roads.graphml --start-lat 15.85 --start-lng 74.49 --end-lat 15.86 --end-lng 74.50
```

Call it offline to precompute candidate road distances; use an application cache keyed by snapped origin/destination nodes. Graph routing distance is not observed traffic; ETA still uses an explicitly assumed speed.

## 5. Train demand forecasting model

```bash
cd server
node scripts/export-demand.js ../python/demand_history_export.csv
cd ..
python python/train_demand.py --csv python/demand_history_export.csv --out python
cd server
node scripts/import-predictions.js ../python/predictions.json
```

Read `python/model_report.json`. It evaluates the most recent 7 days against the earlier 21 days, compares model MAE to a time-of-day baseline, and creates zone forecasts for the next 24 hours. All results remain labeled as **synthetic** until real local measurements exist.

## 6. API examples (login, book, accept)

```bash
curl -s http://localhost:5000/api/health
curl -s -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"passenger001@ridesync.demo","password":"DemoPass123!"}'
```

Use the returned JWT as `Authorization: Bearer <token>`:

```json
POST /api/rides
{
  "pickup": {"lat":15.8497,"lng":74.4977},
  "dropoff": {"lat":15.86,"lng":74.51},
  "pickupZoneCode": "DEMO-Z1",
  "dropoffZoneCode": "DEMO-Z2",
  "passengerCount": 1,
  "poolingRequested": false
}
```

To accept an offer, log in as the selected `driverXXX@ridesync.demo`, get `/api/driver/offers`, then call `POST /api/rides/:id/offers/:offerId/respond` with `{ "accept": true }`. Driver status progression: `ARRIVING`, `IN_PROGRESS`, `COMPLETED` via `PATCH /api/rides/:id/status`.

## 7. Algorithm limitations

- Live dispatch: atomic single-request `AVAILABLE` → `RESERVED` driver claim, weighted scoring, timeout and next-driver retry.
- `POST /api/admin/matching/batch-preview`: Hungarian *preview*, not integrated production dispatch; the API does not claim batch dispatch has been installed.
- `POST /api/pooling/find`: spatial/directional pre-filter, not full road-based pooling/confirmed multi-rider execution.
- Demand model: **genuinely trained** by running the Python script; until then no predictions exist.
- Live route distance: fallback Haversine × 1.35 and 22 km/h, explicitly simulated until GraphML road lookup is connected.
- The cross-collection ride+offer write operations use conditional updates and compensation rather than guaranteed multi-document ACID transactions. For a production system, use MongoDB transactions on a replica set and idempotent dispatch locks.
- Reassignment worker is in-process: for multi-instance deployment, move it to a durable queue with leases.

## 8. Required tests before judging

```bash
cd server
node scripts/test-algorithms.js
npm run validate:data
```

End-to-end: request → offer → driver accept → ARRIVING → IN_PROGRESS → COMPLETED; request → reject → next offer; request → timeout → next offer; same driver receives concurrent requests; no available driver → FAILED; cancel while offered; hourly demand and predictions display.

## OSM terms and data provenance

OpenStreetMap map display must retain visible attribution and obey tile-server use policy. Do not bulk download tiles from `tile.openstreetmap.org`; road/POI data via OSMnx/Overpass is separate from the tiles used by Leaflet. NYC TLC data, if used, is NYC data, **not Belagavi demand evidence**.
