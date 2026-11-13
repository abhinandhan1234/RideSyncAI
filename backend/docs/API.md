# Isolated transactional demo API

Base URL: `http://localhost:5002/api/demo`. JSON bodies; errors are
`{error: "CODE", message: "description"}`. IDs are strings. Statuses are lowercase.
This backend implements the supplied booking specification; the root
`docs/API_CONTRACTS.md` remains a proposed, broader interface owned by the team.
The frontend uses the separate authenticated API at `/api`. This legacy demo API is mounted only with `ENABLE_BOOKING_DEMO=true`.

Contract differences: explicit `passengerId` is required (this isolated demo does not use the canonical auth service),
POST rides returns 201 with the dispatched ride, statuses are lowercase,
`/offers/:offerId/accept|reject` replace the proposed nested respond endpoint,
and `/rides/:id/start|complete` replace the proposed PATCH status endpoint.
Both `{lat,lng}` and GeoJSON Point inputs are accepted; persisted/returned locations
use GeoJSON `[longitude,latitude]`. Authentication and account lookup are not
implemented: this is a trusted demo API, not a public deployment.

| Method | Path | Body / filters | Response |
|---|---|---|---|
| GET | /health | — | liveness |
| GET | /drivers | optional `status` | `{drivers: [...]}` |
| PATCH | /drivers/:id/location | `{lat,lng}` or GeoJSON Point | `{driver}` |
| PATCH | /drivers/:id/availability | `{available: boolean}` | `{driver}`; offline before pickup triggers reassignment |
| POST | /rides | `{passengerId,pickup,dropoff,passengerCount:1}` | 201 ride details below |
| GET | /rides | optional `status`, `passengerId`, `limit` (1–100), `skip` | `{rides: [...]}` |
| GET | /rides/:id | — | ride details below |
| GET | /offers/:driverId | — | `{offers: [...]}` (pending, unexpired only) |
| POST | /offers/:offerId/accept | optional `{driverId}` ownership assertion | ride details |
| POST | /offers/:offerId/reject | optional `{driverId}` | replacement ride details |
| POST | /rides/:id/start | — | ride details; accepted → in_progress |
| POST | /rides/:id/complete | — | ride details; in_progress → completed |
| POST | /rides/:id/cancel | `{actor:"passenger"}` (default) or `{actor:"driver",driverId}` | passenger cancels; assigned driver cancellation before pickup reassigns |

Ride details: `{rideId, passengerId, pickup, dropoff, passengerCount, status,
assignedDriverId, assignmentAttempts, assignmentHistory, activeOfferId,
createdAt, updatedAt, acceptedAt?, startedAt?, completedAt?, cancelledAt?,
offer: object|null, driver: object|null}`. Each history entry has a timestamp,
reason, driverId and offerId where applicable. Offer includes `offerId, rideId,
driverId, status, expiresAt, createdAt, score, pickupEtaMinutes, rankingSource`.
ETA is a fallback estimate, not measured road traffic. Terminal states are
`completed`, `cancelled`, `unassigned`. Invalid transitions and expired/answered
offers return 409; missing resources 404; malformed input 400.

Example booking:
```sh
curl -X POST http://localhost:5002/api/demo/rides -H 'Content-Type: application/json' \
  -d '{"passengerId":"P001","pickup":{"lat":15.8497,"lng":74.4977},"dropoff":{"lat":15.8601,"lng":74.5112},"passengerCount":1}'
```
Use the returned offerId to reject, then the replacement offerId to accept;
use rideId to start and complete. Poll GET ride for updates.

## Authenticated PS2 booking

Configure PS2_PYTHON to the Python interpreter with the Phase 1 dependencies
compatible with the canonical joblib artifact (scikit-learn 1.9.0). Development
also discovers ai-engine/validation/.venv automatically. Models and OSM graph
are read locally; inference does not train models.

GET /api/predictions/demand (admin) takes zoneCode or zoneId and from/to ISO
timestamps with offsets. Slots are local Belagavi hours, up to 24. GET
/api/predictions/history returns the specified zone's held-out historical rows.
GET /api/zones/surge returns simulated forecasts, available supply, required
supply, multiplier (surge) and proposed moves. No moves are performed.

GET /api/routes/compare takes originLng, originLat, destLng, destLat and
vehicleType. ESTIMATE_ONLY results have null geometry. POST /api/rides uses the
selected route and multiplies (40 INR + 12/km + 2/rounded-up minute) by the
vehicle/capacity-specific zone surge. Forecast failure uses 1.0. Road travel
time and fuel are estimates. Forecasts are synthetic.

PS2_DISPATCH_POLICY accepts constrained (default), nearest, eta or weighted.
PS2_ETA_PENALTY_MINUTES defaults to 1. Accepted offers have a deadline equal
to their pickup ETA plus ARRIVAL_GRACE_MINUTES (default 5). Only ACCEPTED
rides can be reassigned for lateness. Authenticated riders can inspect the
selection factors via GET /api/rides/:rideId.

Two poolingOptIn bookings can share a ride ID when the first offer is pending,
the reserved driver has capacity and both journeys are covered by the road
network. The graph plan must retain the offered first pickup and satisfy a 25%
in-vehicle detour limit. One document stores membership, stops, separate and
pooled estimates and both surge-adjusted fares. Both passengers share the
lifecycle; cancellation by either cancels the whole booking. POST /api/pools/find
with rideId returns an existing booked pool. Join the authenticated ride room
for status events. The ride history contains the total and poolPlan.fares.

### Individual and Pooling booking options

Send bookingMode INDIVIDUAL (default) or POOLING to POST /api/rides. Individual
requests bypass pool discovery and cannot accept another member. Boolean
poolingOptIn is accepted for older clients; conflicting choices return 400.
POST /api/pools/quote with pickup, dropoff, vehicleType and passengerCount
previews an eligible offered ride. Send its rideId as poolRideId when booking
to join that specific pool; a stale quote returns 409. Without a target, a
pooling request may open a new opt-in ride.

Shared quotes use the expanded Belagavi graph, two same-origin hypothetical
vehicles for the separate comparison, and fastest directed road legs. The
original pickup stays first. Choose the lowest-fuel feasible drop order;
maximum pickup separation 2.5 km, direction difference 60 degrees, wait
10 minutes, in-vehicle detour 25%, additional duration 10 minutes. Only
onboard kilometres/minutes incur fare. One base fare and original surge
apply; split proportional to direct fares, round the first share to paise and
assign the remainder to the second. Joining can reduce the original quote.
No shared booking is offered on estimated-only routes.

GET /api/rides/:rideId and POST /api/pools/find return the persisted plan;
fareEstimate on the ride is the caller's payable amount. The assigned driver
sets ARRIVING then POSTs /api/rides/:rideId/stops/0 through /stops/3 in order.
The fourth stop completes the ride. Before boarding, cancellation of a member
retains the other passenger's agreed fare, ride ID and driver. After boarding
starts, self-service withdrawal is rejected.
