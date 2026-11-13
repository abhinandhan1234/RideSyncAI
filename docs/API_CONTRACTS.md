# RideSync AI — API Contracts

> **Version:** 1.0  
> **Status:** PROPOSED — None of these endpoints are implemented yet. This document defines the intended interface that all agents must implement against.  
> **Last Updated:** 2026-11-13  
> **Base URL:** `http://localhost:3001/api`  
> **Authentication:** Bearer JWT in `Authorization` header for all protected routes.

> **Implementation addendum (2026-11-14):** The current server listens on
> `http://localhost:5002/api`. The historical proposed contracts below do not
> fully describe the runtime API. In particular, `/auth/register` is
> passenger-only; Sarathi uses the separate contracts at the end of this file.

---

## Conventions

- All request/response bodies are `application/json`.
- Timestamps are ISO 8601 strings (UTC): `"2026-11-13T07:41:00.000Z"`.
- GeoJSON coordinates are **[longitude, latitude]** order.
- Error responses follow a uniform shape:
  ```json
  {
    "error": "HUMAN_READABLE_CODE",
    "message": "Descriptive sentence explaining what went wrong."
  }
  ```
- HTTP status codes:
  - `200` OK — successful read or update
  - `201` Created — successful resource creation
  - `202` Accepted — async action initiated (e.g., ride booking)
  - `400` Bad Request — validation failure
  - `401` Unauthorized — missing or invalid JWT
  - `403` Forbidden — valid JWT but insufficient role
  - `404` Not Found
  - `409` Conflict — e.g., race condition on driver accept
  - `500` Internal Server Error

---

## 1. Auth

### POST `/api/auth/register`

Register a new passenger or driver account.

**Auth required:** No

**Request**
```json
{
  "name": "Priya Kulkarni",
  "email": "priya@example.com",
  "phone": "+919876543210",
  "password": "SecurePass123!",
  "role": "passenger"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | ✓ | Min 2 chars |
| `email` | string | ✓ | Valid email format, unique |
| `phone` | string | ✓ | E.164 format, unique |
| `password` | string | ✓ | Min 8 chars |
| `role` | string | ✓ | `"passenger"` or `"driver"` |
| `vehicleType` | string | driver only | `"auto"` \| `"bike"` \| `"sedan"` \| `"suv"` |
| `licencePlate` | string | driver only | Unique |

**Response `201`**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "_id": "64a1f2c3e4b0a1b2c3d4e5f6",
    "name": "Priya Kulkarni",
    "email": "priya@example.com",
    "role": "passenger"
  }
}
```

**Errors**
- `409` — email or phone already registered
- `400` — missing/invalid fields

---

### POST `/api/auth/login`

Authenticate an existing user.

**Auth required:** No

**Request**
```json
{
  "email": "priya@example.com",
  "password": "SecurePass123!"
}
```

**Response `200`**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "_id": "64a1f2c3e4b0a1b2c3d4e5f6",
    "name": "Priya Kulkarni",
    "email": "priya@example.com",
    "role": "passenger"
  }
}
```

**Errors**
- `401` — invalid credentials
- `403` — driver account not yet approved

---

## 2. Drivers

### GET `/api/drivers/nearby`

Find available drivers near a given coordinate. Used by the passenger booking UI to show driver count.

**Auth required:** Yes (passenger, admin)

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `lng` | number | ✓ | Longitude |
| `lat` | number | ✓ | Latitude |
| `radiusKm` | number | — | Search radius; default `3` |
| `vehicleType` | string | — | Filter by vehicle type |

**Example:** `GET /api/drivers/nearby?lng=74.4977&lat=15.8497&radiusKm=5`

**Response `200`**
```json
{
  "count": 4,
  "drivers": [
    {
      "driverId": "64b2a3c4d5e6f7a8b9c0d1e2",
      "vehicleType": "auto",
      "distanceKm": 0.8,
      "etaMinutes": 3,
      "location": {
        "type": "Point",
        "coordinates": [74.4910, 15.8521]
      }
    }
  ]
}
```

---

### PATCH `/api/drivers/availability`

Toggle the authenticated driver's availability.

**Auth required:** Yes (driver)

**Request**
```json
{
  "available": true
}
```

**Response `200`**
```json
{
  "driverId": "64b2a3c4d5e6f7a8b9c0d1e2",
  "available": true,
  "updatedAt": "2026-11-13T07:50:00.000Z"
}
```

---

## 3. Rides

### POST `/api/rides`

Book a new ride. Initiates the matching pipeline asynchronously.

**Auth required:** Yes (passenger)

**Request**
```json
{
  "pickup": {
    "type": "Point",
    "coordinates": [74.4977, 15.8497]
  },
  "pickupAddress": "Nehru Nagar, Belagavi",
  "dropoff": {
    "type": "Point",
    "coordinates": [74.5112, 15.8601]
  },
  "dropoffAddress": "Tilakwadi, Belagavi",
  "routeType": "eco",
  "poolingOptIn": false
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `pickup` | GeoJSON Point | ✓ | `[lng, lat]` |
| `dropoff` | GeoJSON Point | ✓ | `[lng, lat]` |
| `routeType` | string | ✓ | `"fastest"` \| `"shortest"` \| `"eco"` |
| `poolingOptIn` | boolean | — | Default `false` |

**Response `202`**
```json
{
  "rideId": "64c3b4d5e6f7a8b9c0d1e2f3",
  "status": "REQUESTED",
  "fareEstimate": 87.50,
  "surgeMultiplier": 1.0,
  "estimatedDistanceKm": 3.2,
  "estimatedDurationMin": 11,
  "estimatedFuelL": 0.19,
  "createdAt": "2026-11-13T07:41:00.000Z"
}
```

**Errors**
- `400` — invalid coordinates or routeType
- `409` — passenger already has an active ride

---

### POST `/api/rides/:id/offers/:offerId/respond`

Driver accepts or rejects a ride offer.

**Auth required:** Yes (driver — must own this offer)

**URL Params**

| Param | Description |
|-------|-------------|
| `:id` | `rides._id` |
| `:offerId` | `ride_offers._id` |

**Request**
```json
{
  "action": "accept"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `action` | string | ✓ | `"accept"` \| `"reject"` |

**Response `200` (accepted)**
```json
{
  "rideId": "64c3b4d5e6f7a8b9c0d1e2f3",
  "offerId": "64d4c5d6e7f8a9b0c1d2e3f4",
  "status": "ACCEPTED",
  "pickupNavigation": {
    "waypoints": [
      [74.4910, 15.8521],
      [74.4950, 15.8503],
      [74.4977, 15.8497]
    ],
    "distanceKm": 0.8,
    "etaMinutes": 3
  }
}
```

**Errors**
- `409` — offer already accepted by another concurrent request
- `404` — offer not found or expired
- `403` — authenticated driver does not own this offer

---

### PATCH `/api/rides/:id/status`

Advance a ride through its lifecycle states.

**Auth required:** Yes (driver for most transitions; admin for override)

**Request**
```json
{
  "status": "ARRIVING"
}
```

Allowed driver-initiated transitions:

| From | To | Actor |
|------|----|-------|
| `ACCEPTED` | `ARRIVING` | driver |
| `ARRIVING` | `ARRIVED` | driver |
| `ARRIVED` | `ONGOING` | driver |
| `ONGOING` | `COMPLETED` | driver |
| `ACCEPTED` | `CANCELLED` | passenger (via their own endpoint) |

**Response `200`**
```json
{
  "rideId": "64c3b4d5e6f7a8b9c0d1e2f3",
  "previousStatus": "ACCEPTED",
  "newStatus": "ARRIVING",
  "updatedAt": "2026-11-13T07:52:00.000Z"
}
```

**Errors**
- `400` — invalid status transition
- `403` — actor not permitted for this transition

---

### POST `/api/rides/:id/reassign`

Manually trigger reassignment (admin override or system-initiated after timeout).

**Auth required:** Yes (admin or system service token)

**Request**
```json
{
  "reason": "driver_timeout",
  "excludeDriverIds": ["64b2a3c4d5e6f7a8b9c0d1e2"]
}
```

**Response `202`**
```json
{
  "rideId": "64c3b4d5e6f7a8b9c0d1e2f3",
  "status": "REASSIGNING",
  "attemptNumber": 2,
  "message": "Matching next available driver."
}
```

**Errors**
- `409` — ride is not in a reassignable state
- `422` — max reassignment attempts exceeded; ride set to FAILED

---

## 4. Predictions

### GET `/api/predictions/demand`

Retrieve AI demand forecasts for one or more zones.

**Auth required:** Yes (admin)

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `zoneId` | string | — | Filter by specific zone ObjectId |
| `from` | ISO string | — | Forecast window start; default now |
| `to` | ISO string | — | Forecast window end; default +6h |

**Response `200`**
```json
{
  "predictions": [
    {
      "zoneId": "64e5d6e7f8a9b0c1d2e3f4a5",
      "zoneName": "Central Belagavi",
      "slotStart": "2026-11-13T08:00:00.000Z",
      "slotEnd": "2026-11-13T08:30:00.000Z",
      "predictedCount": 23,
      "confidenceLow": 18,
      "confidenceHigh": 29,
      "modelVersion": "gbr-v1.2"
    }
  ]
}
```

---

## 5. Routes

### GET `/api/routes/compare`

Compare three route types for a given origin–destination pair.

**Auth required:** Yes (passenger)

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `originLng` | number | ✓ | |
| `originLat` | number | ✓ | |
| `destLng` | number | ✓ | |
| `destLat` | number | ✓ | |
| `vehicleType` | string | — | For fuel estimate; default `"auto"` |

**Response `200`**
```json
{
  "routes": {
    "fastest": {
      "type": "fastest",
      "waypoints": [[74.4977, 15.8497], [74.5112, 15.8601]],
      "distanceKm": 3.6,
      "durationMin": 10,
      "estimatedFuelL": 0.22,
      "estimatedCo2Kg": 0.52
    },
    "shortest": {
      "type": "shortest",
      "waypoints": [[74.4977, 15.8497], [74.5050, 15.8550], [74.5112, 15.8601]],
      "distanceKm": 3.1,
      "durationMin": 13,
      "estimatedFuelL": 0.19,
      "estimatedCo2Kg": 0.45
    },
    "eco": {
      "type": "eco",
      "waypoints": [[74.4977, 15.8497], [74.5030, 15.8530], [74.5112, 15.8601]],
      "distanceKm": 3.3,
      "durationMin": 12,
      "estimatedFuelL": 0.17,
      "estimatedCo2Kg": 0.40
    }
  }
}
```

---

## 6. Admin

### GET `/api/admin/analytics`

Aggregate analytics for the admin dashboard.

**Auth required:** Yes (admin)

**Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `period` | string | `"today"` \| `"week"` \| `"month"` |
| `zoneId` | string | Filter to a specific zone |

**Response `200`**
```json
{
  "period": "today",
  "summary": {
    "totalRides": 142,
    "completedRides": 128,
    "cancelledRides": 9,
    "failedRides": 5,
    "avgWaitTimeMin": 4.2,
    "totalRevenue": 12480.00,
    "activeDrivers": 23,
    "avgDriverUtilisation": 0.71
  },
  "routeTypeDistribution": {
    "fastest": 61,
    "shortest": 38,
    "eco": 43
  },
  "topZones": [
    { "zoneId": "64e5...", "zoneName": "Central Belagavi", "rideCount": 47 }
  ]
}
```

---

## 7. Zones

### GET `/api/zones/surge`

Retrieve current surge pricing for all zones.

**Auth required:** Yes (passenger, driver, admin)

**Response `200`**
```json
{
  "zones": [
    {
      "zoneId": "64e5d6e7f8a9b0c1d2e3f4a5",
      "zoneName": "Central Belagavi",
      "multiplier": 1.5,
      "reason": "High demand — evening peak",
      "effectiveFrom": "2026-11-13T17:00:00.000Z",
      "effectiveTo": "2026-11-13T20:00:00.000Z"
    },
    {
      "zoneId": "64f6e7f8a9b0c1d2e3f4a5b6",
      "zoneName": "Tilakwadi",
      "multiplier": 1.0,
      "reason": null,
      "effectiveFrom": null,
      "effectiveTo": null
    }
  ]
}
```

---

## 8. Pools

### POST `/api/pools/find`

Find or create a ride pool matching the given ride parameters.

**Auth required:** Yes (passenger)

**Request**
```json
{
  "rideId": "64c3b4d5e6f7a8b9c0d1e2f3",
  "pickup": {
    "type": "Point",
    "coordinates": [74.4977, 15.8497]
  },
  "dropoff": {
    "type": "Point",
    "coordinates": [74.5112, 15.8601]
  },
  "maxDetourPercent": 25
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `rideId` | string | ✓ | The requesting ride |
| `maxDetourPercent` | number | — | Max acceptable detour vs. direct; default `25` |

**Response `200` (pool found)**
```json
{
  "poolId": "64g7f8a9b0c1d2e3f4a5b6c7",
  "status": "forming",
  "currentCapacity": 1,
  "maxCapacity": 3,
  "estimatedSavingPercent": 20,
  "mergedRoute": {
    "waypoints": [[74.4977, 15.8497], [74.5000, 15.8520], [74.5112, 15.8601]],
    "distanceKm": 3.5,
    "durationMin": 14
  }
}
```

**Response `404` (no compatible pool found)**
```json
{
  "error": "NO_POOL_AVAILABLE",
  "message": "No compatible ride pool found within the detour tolerance. The ride will proceed as a solo booking."
}
```

---

## Socket.IO Events (Reference)

| Event | Direction | Description |
|-------|-----------|-------------|
| `ride_offered` | Server → Driver | New ride offer dispatched |
| `offer_timeout` | Server → Driver | Offer window expired |
| `ride_accepted` | Server → Passenger | Driver confirmed |
| `driver_location` | Server → Passenger | GPS update during ARRIVING/ONGOING |
| `ride_status_changed` | Server → Both | Any status transition |
| `surge_updated` | Server → Passenger | Zone surge multiplier changed |

See `ARCHITECTURE.md §5` for full payload definitions.

---

## Implemented booking experience additions

### GET `/api/locations/search?q={query}`

Returns up to six OpenStreetMap Nominatim place results. Queries must contain 3–120 characters. Results are cached for 10 minutes, identical pending requests are coalesced, outbound requests are spaced at least 1.1 seconds apart, and each client is limited to 30 requests per minute.

```json
{"suggestions":[{"name":"Belagavi Railway Station","address":"…","latitude":15.8553,"longitude":74.507,"placeType":"railway"}]}
```

### GET `/api/locations/reverse?lat={latitude}&lon={longitude}`

Reverse geocodes a map selection and returns `{ "location": { "name", "address", "latitude", "longitude", "placeType" } }`. Coordinate ranges are validated and the same geocoder cache/throttle is used.

### Ride booking and tracking details

`POST /api/rides` also accepts `pickupAddress` and `dropoffAddress` (selected place names, each up to 200 characters) and persists them with the ride. `GET /api/rides/:rideId` returns those labels, passenger count, route type, estimate fields, and assigned driver name/vehicle/location when a driver is assigned. Existing authentication and ranked dispatch remain in force.

### PATCH `/api/drivers/location`

Driver-only. Accepts `{ "latitude": 15.85, "longitude": 74.50 }`, validates WGS84 ranges, updates the authenticated driver's GeoJSON point and timestamp, then notifies the ride room if they have an active ride.

### PATCH `/api/rides/:rideId/cancel`

Passenger-only. Accepts an optional reason from `Changed my plans`, `Booked by mistake`, `Driver taking too long`, `Found another ride`, or `Other`. Cancellation atomically claims only eligible pre-completion states, records the reason/time, closes a pending offer, releases the driver only when still assigned to that ride, and notifies the driver's user room. The existing POST cancellation route remains as a compatibility alias.

The driver lifecycle now supports `ACCEPTED → ARRIVING → ARRIVED → ONGOING → COMPLETED`; the passenger tracking page refreshes backend state every two seconds and stops at a terminal state.

---

## Current Sarathi implementation

All routes below are implemented in `backend/src/routes/sarathi.routes.js` unless
marked as an existing driver route. Protected Sarathi routes require a `DRIVER`
JWT. Admin routes require an `ADMIN` JWT. The role names in signed tokens are
uppercase.

### `POST /api/sarathi/register`

Public. Accepts `fullName`, `phone`, `email`, `password`, `address`, `city`,
`vehicleCategory` (`BIKE`, `AUTO`, `CAR`), `manufacturer`, `model`,
`registrationNumber`, and optional `vehicleColor`, `vehicleRcDetails`, `upiId`,
`upiAccountHolder`, and `preferredPaymentMethod` (`UPI`, `CASH`, `BOTH`). Phone
and email are unique. Passwords use bcrypt. Creates an offline `DRIVER` and
`PENDING_REVIEW` application. Returns a JWT and profile summary (`201`). Duplicate
phone/email returns `409`.

### `POST /api/sarathi/login`

Public. Accepts `phone` and `password`, returns `{ accessToken, user, driver }`.
Invalid credentials return `401`.

### `GET|PATCH /api/sarathi/profile`

Driver-only. GET returns the authenticated user's name, email, phone, approval
and availability state, personal profile, document verification states, vehicle,
payment receiving details, and active ride ID. PATCH accepts only the explicit
personal, vehicle, and payment fields rendered by the portal. UPI IDs are
validated. The response contains the saved driver summary.

### Photo upload and removal

- `POST /api/sarathi/upload/profile-photo`
- `POST /api/sarathi/upload/vehicle-photo`
- `DELETE /api/sarathi/upload/profile-photo`
- `DELETE /api/sarathi/upload/vehicle-photo`

POST accepts `{ "dataUrl": "data:image/jpeg;base64,..." }`; JPEG, PNG, and WebP
are allowed, the decoded image must match its declared type and be at most 2 MB.
Files are written under ignored `backend/uploads/`; MongoDB stores only a URL.

### `PATCH /api/sarathi/availability`

Driver-only. Accepts `{ "availability":"ONLINE", "latitude":15.85,
"longitude":74.50 }` or `{ "availability":"OFFLINE" }`. Online requires a
valid GPS point in a configured service zone. No availability change is allowed
while a ride is active. In production, Online additionally requires admin
approval and both documents verified by Cashfree in live mode. `ON_TRIP` is set
when the existing ride lifecycle advances to `ONGOING`; completion restores
`AVAILABLE`.

### DigiLocker verification

- `POST /api/sarathi/verification/digilocker/start` accepts
  `{ "documentType":"AADHAAR" }` or `DRIVING_LICENSE`.
- `GET /api/sarathi/verification/digilocker/status?document=AADHAAR` (or
  `DRIVING_LICENSE`) reads the independent persisted status.
- `POST /api/webhooks/cashfree/digilocker` captures the raw JSON bytes before
  parsing. In demo mode it returns `409`; in live mode without a webhook secret
  it returns `503`; bad signatures return `401`. After a valid signature it
  returns `501 LIVE_INTEGRATION_PENDING`; it does not update verification status.

With `DIGILOCKER_MODE=demo`, start records `DEMO_VERIFIED` from provider `DEMO`
and explicitly says no government document was checked. Demo never sets
`VERIFIED`. Live start reports missing credentials or the pending integration
status and makes no Cashfree API call. Callback processing, status/document
retrieval, webhook idempotency, and live verification promotion remain pending.

### Admin review

- `GET /api/admin/sarathi` lists pending-review and correction-request
  applications for `ADMIN` only. It omits full document numbers.
- `PATCH /api/admin/sarathi/:driverId/approval` accepts
  `{ "status":"APPROVED" }`, or `REJECTED` / `NEEDS_CORRECTION` plus a note.

See [`SARATHI_ADMIN.md`](SARATHI_ADMIN.md) for enabling a trusted admin account.
Approval is independent of identity verification. Production dispatch retains
the existing ranked algorithm and adds the live-approved verification filter.

### Existing offer and ride API used by the portal

Sarathi consumes the existing `GET /api/driver/offers`,
`POST /api/offers/:offerId/respond` with `accept|reject`,
`GET /api/rides/:rideId`, and `PATCH /api/rides/:rideId/status` endpoints. These
continue to use the existing driver ownership checks and matching algorithm.
