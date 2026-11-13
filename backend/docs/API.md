# Booking API (implemented)

Base URL: `http://localhost:5002/api`. JSON bodies; errors are
`{error: "CODE", message: "description"}`. IDs are strings. Statuses are lowercase.
This backend implements the supplied booking specification; the root
`docs/API_CONTRACTS.md` remains a proposed, broader interface owned by the team.
The frontend currently has no booking API calls. It must wire submission separately.

Contract differences: explicit `passengerId` is required (no existing auth service),
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
curl -X POST http://localhost:5002/api/rides -H 'Content-Type: application/json' \
  -d '{"passengerId":"P001","pickup":{"lat":15.8497,"lng":74.4977},"dropoff":{"lat":15.8601,"lng":74.5112},"passengerCount":1}'
```
Use the returned offerId to reject, then the replacement offerId to accept;
use rideId to start and complete. Poll GET ride for updates.
