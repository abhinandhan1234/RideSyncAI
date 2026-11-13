# RideSync AI booking backend

Express + Mongoose API for booking, sequential driver offers, rejection/timeout
reassignment, driver cancellation/unavailability, start, completion and passenger
cancellation. All changes are confined to this backend. See [API documentation](docs/API.md)
for request/response shapes and differences from the proposed shared contract.

## Start a disposable demo

Requires Node.js 20.19+ (tested with Node 24) and npm. This starts an isolated
MongoDB replica set, seeds three **synthetic** drivers, and runs the primary
`src/server.js`. No existing database is accessed. The first run downloads a MongoDB
7 binary; the demo and test tools need network access for that download.

```sh
cd /workspace/RideSyncAI/backend
npm ci
npm run demo
```

API: `http://localhost:5002/api`. Drivers are near latitude `15.8497`, longitude
`74.4977`. Use the booking example in [docs/API.md](docs/API.md), reject the first
offer, accept the replacement, then start and complete the ride. Demo data is
discarded when the process exits. `npm run demo` overrides any existing MongoDB URI
with its disposable database. It does not overwrite `.env`.

## Start with persistent MongoDB

```sh
cd /workspace/RideSyncAI/backend
npm ci
cp .env.example .env
# Set MONGODB_URI to your Atlas database or local replica set.
npm start
# Or: npm run dev
```

The server connects, checks transaction support, and creates additive indexes
before listening on port 5002. It never drops indexes or seeds production data.
Use a dedicated booking database to avoid incompatible historical unique indexes.
Provision drivers using the model in `src/models/booking.js` (see demo fixture in
`scripts/demo.js`). Synthetic fixtures must carry `isSynthetic: true`.

**Deployment constraint:** MongoDB replica set or sharded cluster/Atlas is required.
Standalone MongoDB is rejected at startup. There is no standalone compensation
mode; transaction rollback prevents partial ride/offer/reservation writes.
A single-node replica set is sufficient for development.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| PORT | 5002 | HTTP port |
| MONGODB_URI | required | Replica set or Atlas URI |
| CLIENT_ORIGIN | http://localhost:5173 | Allowed browser origin |
| AI_ENGINE_URL | unset | AI base URL; unset uses fallback |
| AI_REQUEST_TIMEOUT_MS | 1500 | AI request deadline |
| MAX_ASSIGNMENT_ATTEMPTS | 4 | Maximum offers per ride |
| OFFER_TIMEOUT_SECONDS | 20 | Offer validity |
| OFFER_WORKER_INTERVAL_MS | 1000 | Recovery/expiration polling interval |
| MAX_PICKUP_KM | 12 | Straight-line pickup eligibility radius |

Invalid numeric settings fail early. The AI adapter calls `POST /rank-drivers`
with the supplied specification's lat/lng payload. Invalid, duplicate or unknown
ranked IDs, HTTP errors, malformed JSON and timeout all use deterministic fallback.
Partial valid rankings append remaining candidates in fallback order.
Fallback uses distance, acceptance rate, idle time and workload; availability and
capacity are hard eligibility filters. ETAs use the starter's 1.35 road factor and
22 km/h estimate, not real road routing or measured traffic.

## Reliability and storage

- Collections: `drivers`, `rides`, `offers`; GeoJSON `[lng,lat]` points and 2dsphere
  indexes. UUID-based public IDs are distinct from MongoDB `_id` values.
- Every assignment claims the driver, inserts the offer and advances the ride
  within one transaction. Pending offers reserve drivers before acceptance.
- Partial unique indexes enforce one pending offer per ride and per driver;
  `(rideId, attempt)` is unique. Conditional reservation and transaction write
  conflicts protect concurrent requests across server instances.
- Rejections, timeouts and driver cancellations release only the owned reservation
  and append history in the same transaction. All previously attempted drivers
  are excluded. Max attempts or exhausted supply produces `unassigned`.
- Persisted `searching` rides are retried by the worker after a crash. Expired
  pending offers are processed transactionally; multiple workers may safely race.
  No TTL index deletes the audit trail. Worker batches are intended for demo scale.
- Completion releases the driver and increments completed count once. Passenger
  cancellation terminates the ride; driver cancellation before pickup reassigns.
- Historical documents without the new public IDs are ignored by lifecycle routes
  and workers. No historical data or zones are migrated. Only Z01–Z08 are valid
  for new driver zone codes. Legacy starter driver records are not silently
  converted or enrolled into the live fleet.
- Request logs contain method, route template, status and duration, not bodies,
  query values, credentials or MongoDB errors. Public serializers allowlist fields.

## Tests

```sh
npm test
```

Tests launch an isolated local MongoDB replica set; they never use `MONGODB_URI`.
Coverage includes the full demo, real database races, rollback after an injected
write validation failure, worker recovery, expiry, driver unavailability,
terminal-state protection, input validation and AI fallback/HTTP timeout.
If the default cache location is not writable:

```sh
npm ci --cache /tmp/ridesync-npm-cache
MONGOMS_DOWNLOAD_DIR=/tmp/ridesync-mongodb npm test
```

## Integration limits

This is a trusted hackathon API: authentication, passenger account lookup and
role authorization are not implemented. Passenger IDs are validated syntactically;
an optional driverId assertion is not authentication. Do not expose it publicly
until the team's auth layer is integrated. The frontend remains a static placeholder
and needs a submit handler and polling integration. No live AI service or existing
MongoDB datasets were accessed during development. Socket.IO notifications,
faring, pooling, forecasting and the root proposed auth APIs are outside this task.
