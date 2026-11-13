# RideSync AI — Project Specification

> **Version:** 1.0  
> **Status:** Active Development  
> **Last Updated:** 2026-11-13

---

## 1. Overview

RideSync AI is an AI-enhanced urban ride-sharing and driver dispatch platform designed for mid-sized Indian cities (initially targeting Belagavi). The system combines real-time demand prediction, eco-aware routing, intelligent driver–passenger matching, and an administrative simulation layer (CityLab) into a single cohesive product.

### 1.1 Goals

| Goal | Description |
|------|-------------|
| **Efficiency** | Minimise passenger wait time and driver idle time through predictive demand models |
| **Sustainability** | Surface eco-friendly route options and track per-ride fuel consumption |
| **Transparency** | Show real-time surge pricing rationale to both passengers and drivers |
| **Resilience** | Auto-reassign rides when drivers reject, time-out, or cancel |
| **Observability** | Give city administrators a simulation layer (CityLab) to test dispatching policies |

---

## 2. User Roles

### 2.1 Passenger
A registered end-user who requests rides, views route options, tracks the driver in real time, and receives a final receipt.

### 2.2 Driver
A registered, verified vehicle operator who receives ride offers, accepts or rejects them, navigates to pickup, and completes the trip.

### 2.3 Administrator
A city-level operator who monitors fleet health, views demand heat maps, runs CityLab simulations, and adjusts zone-level surge pricing rules.

---

## 3. Ride Lifecycle

```
REQUESTED → OFFERED → ACCEPTED → ARRIVING → ONGOING → COMPLETED
                   ↘ REJECTED / TIMEOUT
                            ↓
                       REASSIGNING
                            ↓
                        OFFERED  (next driver)
                        ...
              (after MAX_REASSIGN attempts)
                            ↓
                         FAILED
```

### 3.1 State Definitions

| State | Description |
|-------|-------------|
| `REQUESTED` | Passenger has submitted a booking request. Backend validates, records the ride, and starts matching. |
| `OFFERED` | AI-selected driver has received a push notification / Socket.IO event with trip details. |
| `ACCEPTED` | Driver confirmed the offer. Passenger is notified. Driver navigation begins. |
| `ARRIVING` | Driver signals they are approaching the pickup point (within configurable radius, e.g. 300 m). |
| `ONGOING` | Driver has confirmed passenger on-board and started the trip meter. |
| `COMPLETED` | Driver marks the trip done at drop-off. Fare is calculated and stored. |
| `REJECTED` | Driver explicitly declined the offer. Triggers reassignment flow. |
| `TIMEOUT` | Driver did not respond within `OFFER_TIMEOUT_SECONDS` (default 30 s). Triggers reassignment flow. |
| `REASSIGNING` | Backend is selecting the next candidate driver. |
| `CANCELLED` | Passenger cancelled before ACCEPTED, or backend cancelled after MAX_REASSIGN attempts. |
| `FAILED` | Exhausted all candidate drivers. Passenger is notified with an apology and re-queue option. |

### 3.2 State Transition Rules

- **REQUESTED → OFFERED**: Automatic, triggered by the matching engine. Requires at least one available driver within search radius.
- **OFFERED → ACCEPTED**: Driver action within `OFFER_TIMEOUT_SECONDS`. Atomic update with optimistic locking to prevent double-accept.
- **OFFERED → REJECTED**: Driver presses "Decline" in app.
- **OFFERED → TIMEOUT**: Backend watchdog timer fires. Treated identically to REJECTED for reassignment purposes.
- **ACCEPTED → ARRIVING**: Driver action when within arrival radius.
- **ARRIVING → ONGOING**: Driver action confirming passenger pickup.
- **ONGOING → COMPLETED**: Driver action confirming drop-off.
- **Any pre-ONGOING state → CANCELLED**: Passenger action (cancellation fee may apply after ACCEPTED).
- **REJECTED or TIMEOUT → REASSIGNING**: Automatic.
- **REASSIGNING → OFFERED**: Next driver selected and notified. Attempt counter incremented.
- **REASSIGNING → FAILED**: Attempt counter exceeds `MAX_REASSIGN_ATTEMPTS` (default 5).

---

## 4. Passenger Workflow

### 4.1 Registration & Login
1. Passenger opens the web app.
2. Navigates to `/register` → provides name, phone, email, password.
3. Backend returns a JWT access token; passenger is redirected to the booking screen.
4. Returning users log in via `/login`.

### 4.2 Booking a Ride
1. Passenger enters **pickup location** (map pin or typed address → geocoded via OSMnx / Nominatim).
2. Passenger enters **drop-off location**.
3. System displays **three route options** (EcoRoute):
   - 🚀 Fastest (minimum travel time)
   - 📏 Shortest (minimum distance)
   - 🌱 Eco (minimum estimated fuel consumption)
4. Each option shows estimated duration, distance, and CO₂/fuel estimate.
5. Passenger selects a route and optionally opts into **ride pooling** (share with another passenger).
6. Fare estimate is displayed (base fare + per-km + surge multiplier if applicable).
7. Passenger confirms — ride enters `REQUESTED` state.

### 4.3 Waiting & Tracking
- Real-time driver location is shown on a Leaflet map via Socket.IO.
- ETA countdown is displayed.
- Passenger can cancel before `ACCEPTED` without fee; a small fee applies after `ACCEPTED`.

### 4.4 Ride Completion
- Upon `COMPLETED`, passenger sees fare breakdown, trip summary, and route taken.
- Eco savings (vs. fastest route) are highlighted if the eco route was chosen.
- Passenger can rate the driver (1–5 stars).

---

## 5. Driver Workflow

### 5.1 Registration & Login
1. Driver registers with personal details, vehicle type (auto, bike, sedan, SUV), licence plate, and uploads a document reference.
2. Admin approves driver account (or auto-approve for MVP).
3. Driver logs in and sees the driver dashboard.

### 5.2 Availability Toggle
- Driver sets themselves **Available** or **Unavailable**.
- When Available, the driver's GPS location is polled every 10 seconds and stored in `driver_locations`.
- Driver is included in the matchable pool only when `available = true` and no active ride is in progress.

### 5.3 Receiving & Responding to Offers
1. Driver receives a Socket.IO push: pickup location, drop-off preview, estimated earnings, distance to pickup.
2. A 30-second countdown timer is displayed.
3. Driver presses **Accept** or **Decline**.
4. On **Accept**: app transitions to navigation mode (pickup route shown).
5. On **Decline** or timeout: offer is withdrawn; driver may be deprioritised in future scoring if acceptance rate drops below threshold.

### 5.4 Executing the Ride
1. Driver navigates to pickup using in-app Leaflet directions.
2. Driver presses **Arrived** when within arrival radius.
3. Driver presses **Start Ride** after passenger confirms boarding.
4. Driver navigates to drop-off.
5. Driver presses **Complete Ride**.

### 5.5 Earnings & Fuel Dashboard
- Driver sees per-ride earnings and daily totals.
- Fuel Dashboard shows estimated fuel cost per ride and cumulative consumption.
- Weekly efficiency score (earnings per litre) is displayed.

---

## 6. Admin Workflow

### 6.1 Fleet Monitoring
- Real-time map of all active drivers and their status.
- Demand heat map overlay from prediction model.
- KPIs: active rides, average wait time, driver utilisation rate, failed ride rate.

### 6.2 Surge Pricing Management
- View zone-level surge multipliers currently in effect.
- Manually override surge for a zone (e.g., during events).
- Audit log of all multiplier changes.

### 6.3 CityLab Simulation
- Admin selects a scenario (time of day, event type, fleet size).
- Python AI engine runs a simulation using historical demand data.
- Results: simulated wait times, revenue, CO₂ emissions.
- Simulation results are stored in `simulation_runs` for comparison.

### 6.4 Analytics
- Daily/weekly demand charts per zone.
- Driver performance league table.
- Route type distribution (fastest vs eco vs shortest).
- Fare revenue breakdown.

---

## 7. Edge Cases & Error Handling

### 7.1 Rejected Offers
- Recorded in `ride_offers` with `status: "rejected"`.
- Rejected driver's acceptance rate is decremented.
- System immediately starts REASSIGNING flow.

### 7.2 Timeout Handling
- Backend maintains an in-memory (or Redis-backed) timeout watchdog per active offer.
- On timeout: offer record updated to `status: "timeout"`, ride enters REASSIGNING.
- Timed-out driver is NOT penalised as heavily as an explicit rejection (they may have had connectivity issues).

### 7.3 Cancellations
- **Pre-ACCEPTED**: No fee. Ride moves to `CANCELLED`. Driver (if any) is returned to available pool.
- **Post-ACCEPTED, pre-ONGOING**: Small cancellation fee applied. Driver receives partial compensation.
- **During ONGOING**: Treated as a dispute; admin is notified.

### 7.4 Driver Disconnection
- If a driver's Socket.IO connection drops during ARRIVING or ONGOING, the system retains their last known state.
- If reconnected within 2 minutes, ride continues.
- If not reconnected, admin is alerted; ride may be escalated to manual intervention.

### 7.5 No Drivers Available
- If no available driver is found within search radius, the system expands the radius in steps (1 km → 2 km → 5 km).
- If still none found, the ride enters a short-queue (up to 5 minutes) waiting for a driver to become available.
- After queue timeout, ride is FAILED and passenger is notified.

### 7.6 Concurrent Booking Race Condition
- Multiple passengers may request rides simultaneously.
- Driver acceptance uses a database-level atomic update with an `occupiedBy` field to prevent double-booking.

---

## 8. Non-Functional Requirements

| NFR | Target |
|-----|--------|
| Offer delivery latency | < 2 seconds from REQUESTED to OFFERED |
| Offer timeout | Configurable; default 30 seconds |
| Max reassign attempts | Configurable; default 5 |
| Map update frequency | 10-second location poll interval |
| API response time (p95) | < 500 ms for non-AI endpoints |
| AI prediction latency | < 3 seconds for demand forecast |
| Uptime target (MVP) | 99 % during hackathon demo window |

---

## 9. Out of Scope (MVP)

- Payment gateway integration (fare is calculated but payment is simulated)
- Native mobile apps (iOS / Android)
- Driver background verification pipeline
- Multi-city support
- Passenger scheduling (future rides)
- Voice navigation
