# RideSync AI — Frontend

The `frontend/` directory will contain the **React + Vite + Tailwind CSS** web client for RideSync AI.

> [!IMPORTANT]
> This directory structure is **scaffolded**. The teammate responsible for the frontend should populate it.
> Do **not** run `npm install` or `npm run dev` from other modules — the frontend owner manages this.

---

## Stack

| Technology | Role |
|---|---|
| **React.js** | UI component framework |
| **Vite** | Dev server and build tool (fast HMR) |
| **Tailwind CSS** | Utility-first styling |
| **React Three Fiber** | 3D animated landing page (Three.js bindings) |
| **Leaflet / React-Leaflet** | Interactive maps (ride tracking, driver locations) |
| **Socket.IO client** | Real-time events (ride status, driver pings) |
| **Recharts** | Analytics charts (admin dashboard, fuel usage) |

---

## Setup (Frontend Owner Only)

```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Build for production
npm run build
```

---

## Directory Structure

```
frontend/
├── public/                       ← Static assets served as-is (favicon, robots.txt)
├── src/
│   ├── assets/                   ← Images, fonts, SVGs bundled by Vite
│   ├── components/
│   │   ├── common/               ← Shared UI: Button, Modal, Spinner, Badge, etc.
│   │   ├── landing/              ← 3D animated landing page (React Three Fiber)
│   │   ├── maps/                 ← Leaflet map wrappers, driver markers, route overlays
│   │   ├── passenger/            ← Passenger-specific UI: booking form, offer cards, ride status
│   │   ├── driver/               ← Driver-specific UI: offer toasts, navigation bar, earnings
│   │   └── admin/                ← Admin UI: heat-map overlays, surge controls, CityLab panel
│   ├── pages/
│   │   ├── passenger/            ← Passenger page-level views (Home, BookRide, RideStatus)
│   │   ├── driver/               ← Driver page-level views (Dashboard, ActiveRide, Earnings)
│   │   └── admin/                ← Admin page-level views (Analytics, Zones, Simulation)
│   ├── services/                 ← Axios API client, Socket.IO initialisation, auth helpers
│   ├── hooks/                    ← Custom React hooks (useSocket, useLocation, useAuth)
│   ├── context/                  ← React Context providers (AuthContext, RideContext, SocketContext)
│   └── utils/                    ← Pure utility functions (formatters, geo helpers, constants)
```

### Folder Details

| Folder | What goes here |
|---|---|
| `components/common/` | Reusable presentational components with no route logic |
| `components/landing/` | Three.js / R3F scene, hero section, animated city model |
| `components/maps/` | `<RideMap>`, `<DriverMarker>`, `<RoutePolyline>`, zone overlays |
| `components/passenger/` | `<BookingForm>`, `<OfferCard>`, `<RideTracker>` |
| `components/driver/` | `<OfferToast>`, `<NavBar>`, `<EarningsSummary>` |
| `components/admin/` | `<HeatMap>`, `<SurgeSlider>`, `<CityLabPanel>`, `<FuelDashboard>` |
| `pages/passenger/` | Full-page views composed from passenger components |
| `pages/driver/` | Full-page views composed from driver components |
| `pages/admin/` | Full-page views composed from admin components |
| `services/` | `api.js` (Axios instance), `socket.js` (Socket.IO client), `auth.js` |
| `hooks/` | `useSocket.js`, `useDriverLocation.js`, `useRideStatus.js` |
| `context/` | `AuthContext.jsx`, `RideContext.jsx`, `SocketContext.jsx` |
| `utils/` | `formatDistance.js`, `geoHelpers.js`, `constants.js`, `validators.js` |

---

> [!NOTE]
> `App.jsx`, `index.html`, `vite.config.js`, `tailwind.config.js`, and `package.json`
> are owned by the frontend teammate and will be committed by them.
