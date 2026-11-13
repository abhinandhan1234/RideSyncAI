# Express REST API + socket contract

Server base `http://localhost:5000/api`. Authentication: JWT access token in `Authorization: Bearer ...`. Only `/health`, `/zones`, `/auth/register`, and `/auth/login` are unauthenticated.

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/health` | Public | Runtime health |
| POST | `/auth/register` | Public | Passenger registration only |
| POST | `/auth/login` | Public | JWT login |
| GET | `/auth/me` | Any | Session information |
| GET | `/zones` | Public | Approx/verified zones with provenance |
| GET | `/drivers/nearby?lat=15.85&lng=74.49` | Passenger/Admin | Nearby available (no private user profiles) |
| PATCH | `/drivers/me/location` | Driver | Update location `{lat,lng}` |
| PATCH | `/drivers/me/availability` | Driver | `{available:true/false}` |
| GET | `/driver/offers` | Driver | Pending, unexpired offers |
| POST | `/rides` | Passenger | Create booking and offer next driver |
| GET | `/rides/history` | Passenger | Own history |
| GET | `/rides/:id` | Participant/Admin | Ride details |
| GET | `/rides/:id/events` | Participant/Admin | Audit log |
| POST | `/rides/:id/offers/:offerId/respond` | Driver | `{accept:true/false}` |
| PATCH | `/rides/:id/status` | Driver | `{status:'ARRIVING'/'IN_PROGRESS'/'COMPLETED'}` |
| POST | `/rides/:id/cancel` | Passenger | Cancel own not-yet-in-progress ride |
| GET | `/intelligence/demand` | Auth | Stored model predictions |
| GET | `/intelligence/history` | Auth | Historical zone-hour sample |
| GET | `/intelligence/surge` | Auth | Preview surge per zone |
| GET | `/intelligence/reposition` | Auth | Greedy relocation recommendations |
| POST | `/admin/pricing/refresh` | Admin | Persist simulated surge snapshots from trained forecasts |
| POST | `/pooling/find` | Passenger/Admin | Preview compatible pooled rides |
| GET | `/admin/summary` | Admin | Counts by ride, driver and offer status |
| POST | `/admin/matching/batch-preview` | Admin | Weighted matrix + Hungarian preview |

### Ride response

```json
{
  "rideId":"<Mongo ObjectId>",
  "status":"OFFERED",
  "dispatch":{"status":"OFFERED","offerId":"<id>","driverId":"<id>","score":0.84},
  "estimateSource":"SIMULATED_FALLBACK"
}
```

### Allowed transitions

`REQUESTED → OFFERED → ACCEPTED → ARRIVING → IN_PROGRESS → COMPLETED`.

Reassignment: `OFFERED → REQUESTED → OFFERED` on rejection/timeout; cancellation from REQUESTED, OFFERED, ACCEPTED, ARRIVING; FAILED after candidates/attempts exhausted.

### Socket.IO

Provide the same JWT in `io(url,{auth:{token}})` and watch your ride with `socket.emit('ride:watch', rideId, ack)`; watch is authorization-checked. Driver receives `ride:request` on its authenticated user room; the ride room gets `ride:update`; location changes also emit `driver:location` on authenticated driver room. In a production app, separate driver and passenger location permissions further.

### HTTP example

```bash
curl -X POST http://localhost:5000/api/rides \
 -H 'Content-Type: application/json' -H "Authorization: Bearer $PASSENGER_JWT" \
 -d '{"pickup":{"lat":15.8497,"lng":74.4977},"dropoff":{"lat":15.86,"lng":74.51},"pickupZoneCode":"DEMO-Z1","dropoffZoneCode":"DEMO-Z2","passengerCount":1}'
```

### Not implemented yet

- Validated route insertion, pooled-ride confirmation and shared route scheduling.
- Batched multi-ride reservation using Hungarian results (only a preview).
- Scheduled zone pricing refresh (admin can manually persist a simulated snapshot).
- Live OSM road route lookup; offline Python utility is provided.
- Admin user registration, password reset, production rate limits/monitoring.
