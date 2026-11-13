# RideSyncAI: Intelligent Ride Matching & Dynamic Fleet Optimization System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status: Active Development](https://img.shields.io/badge/Status-Active%20Development-emerald.svg)](#)
[![Geographical Focus: Belagavi, Karnataka](https://img.shields.io/badge/City-Belagavi%2C%20Karnataka%20%F0%9F%87%AE%F0%9F%87%B3-orange.svg)](#)

> **RideSyncAI** is a smart, location-based ride-hailing and fleet intelligence platform engineered to revolutionize urban mobility. Going far beyond naive nearest-driver dispatch, RideSyncAI leverages multi-factor weighted scoring, Hungarian bipartite matching, gradient-boosted ETA estimation, and real-time geospatial telemetry to slash waiting times, eliminate phantom mileage, and maximize driver and passenger satisfaction.

---

## 📍 Initial Deployment Focus: Belagavi, Karnataka, India

The system is calibrated around the transit nodes and road topography of Belagavi, including:
- **Central Bus Terminus (CBT)** & **Belagavi Railway Station (SBC)**
- **KLE Dr. Prabhakar Kore Hospital & Medical Research Centre**
- **Sambra Airport (IXG)**
- **Visvesvaraya Technological University (VTU) Campus**
- **Tilakwadi (Congress Road / 1st-3rd Gate)**
- **Bogarves & Rani Chennamma Circle**
- **Suvarna Vidhana Soudha**

---

## 🚀 Core Application Modules

### 1. 📱 Passenger Application
- Mobile-first **Liquid Glass UI** design with fluid micro-interactions.
- Real-time pickup & destination selection with OpenStreetMap/OSRM routing.
- Live fare estimates, arrival times, and interactive driver matching animations.
- Real-time driver GPS tracking and ride lifecycle status.

### 2. 🚖 Driver Console
- Availability toggle (Online / Offline / En-Route / Busy).
- Intelligent dispatch notifications with acceptance/rejection timers.
- Turn-by-turn route visualization to pickup and destination.
- Real-time earnings tracker and trip history.

### 3. 🌐 Admin Fleet Command Center
- Live geographical fleet radar monitoring all active, idle, and occupied vehicles.
- Belagavi demand heatmaps and dispatch surge visualization.
- Real-time algorithm benchmark simulator (Naive Proximity vs. Multi-Factor vs. Hungarian Matching).
- Fleet utilization analytics and driver performance metrics.

### 4. 🧠 Intelligent Ride Matching Engine
- **Weighted Multi-Factor Scorer**: Optimizes for distance, ETA, rating, driver fatigue/workload, and road congestion.
- **Hungarian Algorithm ($O(V^3)$)**: Optimal batch bipartite matching for simultaneous ride request surges.
- **Route Optimization (Dijkstra / A\*)**: Powered by OSRM topological network graphs.
- **Dynamic Reassignment**: Autonomous re-allocation when conditions change or delays occur.
- **Ride Pooling Engine**: Spatial-temporal detour index evaluation for ride-sharing efficiency.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Three.js, React Three Fiber (R3F), Framer Motion, Lucide Icons, Leaflet / OpenStreetMap |
| **Backend** | Node.js, Express.js, Socket.IO (WebSockets), REST APIs |
| **Database** | PostgreSQL, Prisma ORM, PostGIS |
| **Routing & Geo** | OpenStreetMap (OSM), OSRM routing engine, Turf.js |
| **3D Vehicle UI** | Realistic Honda Taxi 3D Model (`.glb`) with interactive canvas & lighting |

---

## 📁 Repository Architecture

```text
RideSyncAI/
├── client/                     # Liquid Glass React + Vite Frontend
│   ├── src/
│   │   ├── components/        # Reusable UI, Glass Panels, Leaflet Map, 3D Canvas
│   │   ├── pages/             # PassengerApp, DriverApp, AdminDashboard
│   │   ├── services/          # Socket.io, API clients, Belagavi POI data
│   │   └── types/             # Shared TypeScript definitions
│   └── package.json
│
├── server/                     # Real-Time Express + Socket.IO Backend
│   ├── src/
│   │   ├── controllers/       # Ride & Fleet Controllers
│   │   ├── matching/          # Multi-Factor, Hungarian, & Pooling Engines
│   │   ├── simulation/        # Belagavi Live GPS Vehicle Fleet Simulator
│   │   └── socket/            # Real-Time Telemetry & Event Handlers
│   └── package.json
│
└── ml-service/                 # ETA Predictor & Demand Forecasting
```

---

## 📄 License
This project is licensed under the MIT License.

