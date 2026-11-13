# RideSync AI — Hackathon Team Task Matrix

This document defines ownership, deliverables, and boundaries for each of the 4 team members for the 18-hour hackathon.

---

## Team Roster & Ownership

| Member | Focus Area | Primary Directories | Key Deliverables |
|---|---|---|---|
| **Member 1 (Lead AI/ML)** | AI, ML & EcoDispatch Optimization | `ai-engine/`, `data/` | Demand model (Gradient Boosting), OSMnx road graph extraction, A*/Dijkstra routing, EcoRoute fuel comparison logic. |
| **Member 2 (Lead Backend)** | Express, MongoDB, Real-time APIs | `backend/` | MongoDB models (13 collections), REST endpoints, Socket.IO real-time channels, dispatch queue & timeout worker. |
| **Member 3 (Frontend Passenger)** | Passenger App & 3D Visuals | `frontend/src/pages/passenger/`, `frontend/src/components/landing/` | Passenger booking UI, Leaflet map with route visualization, Three.js 3D landing hero. |
| **Member 4 (Frontend Operations)** | Driver & Admin Dashboards, CityLab | `frontend/src/pages/driver/`, `frontend/src/pages/admin/` | Driver offer/accept panel, Admin monitoring dashboard with Recharts, CityLab dispatch simulator. |

---

## Detailed Task Breakdown

### Member 1: AI / ML & Optimization Engine
- [x] Create project requirements and data inspector (`ai-engine/inspect_data.py`).
- [ ] Implement data preprocessing and feature engineering pipeline (`ai-engine/forecasting/preprocess.py`).
- [ ] Train chronological Gradient Boosting Regressor for hourly zone demand.
- [ ] Export trained model and produce validation metrics report (`MAE`, `RMSE`, baseline comparison).
- [ ] Extract Belagavi road network via OSMnx into `data/osm/belagavi_roads.graphml`.
- [ ] Implement Dijkstra / A* route solver with distance, time, and fuel weightings.
- [ ] Write integration script to feed model predictions into backend MongoDB collections.

### Member 2: Backend Architecture & Services
- [x] Scaffold Node.js Express backend with test suite (`tests/health.test.js` passing).
- [x] Configure environment variables and database connector (`src/config/database.js`).
- [ ] Implement Mongoose schemas and `2dsphere` geospatial indexes for all 13 collections.
- [ ] Implement Authentication routes (JWT registration/login for passenger, driver, admin).
- [ ] Build Dispatch Service (`src/services/matching/`) implementing weighted driver scoring.
- [ ] Build Reassignment Service (`src/services/reassignment/`) with 20s timeout and compensation locks.
- [ ] Wire Socket.IO rooms for real-time ride tracking, driver offers, and location updates.
- [ ] Provide endpoints for route comparison and demand forecasts.

### Member 3: Passenger Experience & 3D Landing Page
- [x] Scaffold frontend directory structure and module layout.
- [ ] Build responsive Landing Page with Three.js / React Three Fiber interactive mobility canvas.
- [ ] Build Passenger Ride Request view: pickup/dropoff selection, zone selection, pooling toggle.
- [ ] Integrate Leaflet map displaying active route, vehicle markers, and estimated arrival.
- [ ] Add ride status progression screen (Searching → Driver Assigned → En Route → Completed).
- [ ] Display EcoRoute badge showing estimated liters saved and carbon offset.

### Member 4: Driver Dashboard, Admin Analytics & CityLab
- [x] Scaffold driver and admin components and pages.
- [ ] Build Driver view: online/offline toggle, ride incoming offer modal with 20-second countdown.
- [ ] Build Driver trip progression controls: Arrived at Pickup → Start Trip → Complete Trip.
- [ ] Build Admin Analytics page using Recharts: demand heatmaps, hourly request curves, surge monitor.
- [ ] Build **RideSync CityLab**: interactive simulator letting evaluators toggle baseline FIFO dispatch vs. AI-optimized EcoDispatch.

---

## Shared Coordination Files

| File | Purpose | Rule |
|---|---|---|
| `docs/API_CONTRACTS.md` | API interface contract | Must be agreed upon by Member 2, 3, and 4 before frontend integration. |
| `docs/DATABASE_SCHEMA.md` | Single source of truth for database | Member 2 owns updates; Member 1 coordinates prediction collections. |
| `docs/ALGORITHM_PLAN.md` | Theoretical and mathematical specs | Member 1 coordinates with Member 2 on algorithm porting. |
| `.gitignore` | Prevents repository bloat | Keep models, dumps, node_modules, and cache files out of git. |
| `ridesync-belagavi-starter/` | Reference prototype starter pack | **DO NOT DELETE OR MOVE.** Used as reference for models and mock fixtures. |

