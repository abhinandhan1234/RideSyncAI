# MASTER FRONTEND SPECIFICATION
# INTELLIGENT RIDE MATCHING AND DYNAMIC FLEET OPTIMIZATION SYSTEM

**Permanent Master Specification & Single Source of Truth**

---

## 1. PROJECT CONTEXT
- **Project Name:** Intelligent Ride Matching System (RideSyncAI)
- **Problem Statement:** PS 02 – Intelligent Ride Matching
- **Primary Location:** Belagavi, Karnataka, India
- **Core Applications:**
  1. Passenger Application
  2. Driver Application
  3. Admin Dashboard
- **Design Metaphor:** Premium automotive-inspired intelligent transportation platform, Apple-inspired Liquid Glass UI.

---

## 2. OVERALL DESIGN VISION & VISUAL IDENTITY
- **Primary Background:** Deep charcoal, pitch black, and dark navy (`#0B0F17`, `#07090E`, `#0F172A`).
- **Primary Accent:** Taxi Yellow (`#F59E0B`, `#FBBF24`, `#EAB308`).
- **Secondary Colors:** Crisp white, soft grey, and muted metallic silver.
- **Interface Materials:** Translucent glass, blurred surfaces (`backdrop-filter: blur(24px) saturate(180%)`), subtle edge reflections (`border: 1px solid rgba(255, 255, 255, 0.12)`), layered visual depth.
- **Typography:** Modern, clean, readable sans-serif (Inter / SF Pro Display inspired).
- **Prohibited:** Generic templates, oversized borders, excessive neon/gradients, cartoon vehicles, cluttered layouts.

---

## 3. LIQUID GLASS DESIGN SYSTEM
Reusable components and styling tokens:
- `GlassPanel`: Translucent card with background blur and soft border reflections.
- `GlassButton`: Tactile translucent button with interactive hover/active states.
- `GlassInput`: Frosted input field with subtle focus glows.
- `GlassModal` / `GlassBottomSheet`: Mobile-first swipeable and floating sheets.
- `GlassBadge`: Compact pill indicators for statuses (Requested, Arriving, Active).

---

## 4. MOBILE-FIRST RESPONSIVE DESIGN
- **Mobile Targets:** 360×800, 375×812, 390×844, 430×932 (iPhone/Android portrait).
- **Breakpoints:** Tablet (`>= 768px`), Laptop (`>= 1024px`), Desktop (`>= 1366px`), Large (`1920px`).
- **Rules:** Minimum 44px touch targets, zero unwanted horizontal scroll, safe area padding (`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`).

---

## 5. FLOATING LIQUID GLASS BOTTOM NAVIGATION
- **Primary Global Navigation System:** Floating pill-shaped container anchored near the bottom of the viewport.
- **Passenger Navigation Items:**
  1. `Home` (Hero & 3D Showcase)
  2. `Book Ride` (OSM Belagavi Booking)
  3. `Track` (Live Telemetry & 3D Sync)
  4. `Activity` (Trip History)
  5. `Profile` (Passenger Account & Preferences)
- **Driver & Admin:** Role-appropriate items retaining the identical Liquid Glass pill floating aesthetic.
- **Active State:** Taxi-yellow illuminated icon, spring animation indicator.

---

## 6. TECHNOLOGY STACK
- **Core:** React.js 18, Vite, JavaScript / TypeScript, Tailwind CSS, React Router.
- **3D Engine:** Three.js, React Three Fiber (R3F), `@react-three/drei`, GLTFLoader, GSAP.
- **Animations:** Framer Motion, GSAP.
- **Maps:** OpenStreetMap tiles, Leaflet, React Leaflet, OSRM road routing.
- **Icons:** Lucide React.
- **Charts:** Recharts.
- **Real-Time & Networking:** Axios, Socket.IO Client.

---

## 7. HONDA TAXI – CENTRAL 3D EXPERIENCE
- **Model Reference:** Sketchfab Honda Taxi (Creator: Naman Deep).
- **Asset Path:** `public/models/honda-taxi.glb`.
- **Three.js Architecture:**
  - `TaxiModel.jsx`: GLTF loader, material tuning, headlight toggles, wheel rigging.
  - `TaxiScene.jsx`: Environment, soft contact shadows, cinematic lighting.
  - `TaxiAnimation.jsx`: Idle auto-rotation, route driving, velocity-based wheel spin.
  - `TaxiCamera.jsx`: Cinematic intro, orbit controls, dynamic follow cam.
  - `VehicleController.jsx`: Synchronizes 3D spatial position with 2D Leaflet GPS coordinates.

---

## 8. LANDING PAGE
- Hero headline: *"Your City. Your Ride. Smarter Connections."*
- Subtitle: *"Intelligent ride matching for a faster, smarter and more connected journey."*
- CTA: *Book a Ride* (Primary) & *Explore How It Works* (Secondary).
- Centerpiece: Interactive 3D Honda Taxi in ambient studio lighting.

---

## 9. INTERACTIVE MAP SYSTEM (BELAGAVI, KARNATAKA)
- Leaflet + OpenStreetMap engine configured around Belagavi coordinates (`15.8497° N, 74.4977° E`).
- Floating glass controls, location search (CBT, Belagavi Station, KLE Hospital, Sambra Airport, VTU, Tilakwadi).
- OSRM route line polyline with gradient highlights and animated taxi marker.

---

## 10. PASSENGER BOOKING & 11. INTELLIGENT MATCHING
- Map-first view with floating pickup/destination search and expandable bottom sheet.
- Visual matching sequence:
  1. Finding nearby drivers.
  2. Evaluating ETA & distance.
  3. Checking driver workload & rating.
  4. Best driver selection (Weights: Distance 40%, ETA 30%, Rating 20%, Workload 10%).

---

## 12. LIVE RIDE TRACKING & 3D SYNCHRONIZATION
- Real-time ride lifecycle: `REQUESTED` ➔ `ACCEPTED` ➔ `ARRIVING` ➔ `ONGOING` ➔ `COMPLETED`.
- Synchronized Leaflet 2D coordinate interpolation with Three.js 3D taxi position and orientation.

---

## 13. DRIVER APPLICATION & 14. ADMIN DASHBOARD
- **Driver:** Online/offline switch, dispatched ride prompt with countdown, turn-by-turn guidance, daily earnings.
- **Admin:** Live fleet radar, active/busy vehicle pins, Belagavi demand heatmap, algorithm comparison benchmarks.

---

## 15. ARCHITECTURAL PHASES
1. **Phase 1:** Design system, Liquid Glass components, responsive foundation, and floating navigation.
2. **Phase 2:** Honda Taxi GLB integration and Three.js experience.
3. **Phase 3:** Landing page and passenger booking interface.
4. **Phase 4:** Interactive map, routing, and live ride tracking.
5. **Phase 5:** Driver application.
6. **Phase 6:** Admin dashboard.
7. **Phase 7:** Backend integration, authentication, and real-time Socket.IO.
8. **Phase 8:** Performance optimization, end-to-end testing, and final polish.

