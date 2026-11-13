# Collection dictionary and indexes

**Database:** `ridesync_belagavi` (MongoDB). All relationship IDs are BSON ObjectId refs; unlike PostgreSQL, MongoDB does **not** enforce foreign keys. API/application validation and integrity checks are required.

### Core documents

1. **users**: `displayName`, unique `email`, select:false `passwordHash`, `role` (PASSENGER / DRIVER / ADMIN), `isSynthetic`, timestamps.
2. **drivers**: unique `userId`, unique `externalId`, `vehicle` (type/plate/capacity), GeoJSON `location`, `zoneCode`, `status`, `activeRideId`, `lastLocationAt`, `idleSince`, `acceptanceRate`, completed/offer counters. Indexes: `location: 2dsphere`, `(status,zoneCode,lastLocationAt)`.
3. **zones**: unique `code`, name, GeoJSON `center`, optional verified `geometry`, `radiusKm`, `boundaryVerified` and `source`. Index center 2dsphere. Do NOT use `geometry` for official-zone membership until verified.
4. **rides**: optional unique `sourceId`, passenger, optional driver, GeoJSON pickup/dropoff, pickup/dropoff zone codes, passengerCount, `poolingRequested`, pool reference, status, source (LIVE or SYNTHETIC_HISTORY), simulated distance & ETA, fare object, activeOfferId, attemptCount, time transitions, metadata. Index `(status,requestedAt)`, pickup 2dsphere, `(passengerId,requestedAt)`.
5. **ride_offers**: rideId, driverId, attempt number, status, weighted score/factors, distance estimate, expiry and response timestamps. Unique `(rideId,attempt)`, index `(status,expiresAt)`; no TTL deletion because audit required.
6. **ride_events**: rideId, actor, event type, details, happenedAt. Index `(rideId,happenedAt)`.
7. **demand_history**: unique `sourceKey`, zoneCode, UTC `bucketStart`, Belagavi local hour/day fields, requestCount, supply, wait-time estimate, source=synthetic/observed, simulation run. Index `(zoneCode,bucketStart)`.
8. **demand_predictions**: zoneCode, UTC `forecastFor`, predictedRequests, modelVersion, trainingDataSource, generatedAt. Unique `(zoneCode,forecastFor,modelVersion)`.
9. **driver_activity**: driverId, bucketStart, offers, accepts, completed, busy/idleMinutes, earnings. Unique `(driverId,bucketStart)`.
10. **driver_locations**: driverId, GeoJSON point, speedKmh, recordedAt and source. Index `(driverId,recordedAt)`.
11. **ride_pools**: driverId, rideIds, ordered stop records, status, total route distance/time, passenger count, estimated savings.
12. **zone_pricing**: zoneCode, calculatedAt, predicted demand, supply, demand/supply ratio, multiplier (bounded to 1–2), base/per-km/per-minute prices, source. Index `(zoneCode,calculatedAt)`.
13. **simulation_runs**: unique label, fixed random seed, dataSource, imported filenames, counts and notes.

### GeoJSON standard

All persisted point coordinates are `[longitude, latitude]` **NOT** `[latitude, longitude]`. E.g. `{ "type":"Point", "coordinates":[74.4977,15.8497] }` is an *illustrative approximate city-anchor point*. Drivers and rides must have 2dsphere indexes for nearby searches.

### Data provenance

- `zones_demo.json`: 8 approximate zones, cannot be described as verified administrative polygons.
- `drivers_simulated.csv`: 40 simulated drivers; no real identity data should be inferred.
- `historical_demand_simulated.csv`: 5,376 zone-hour observations/28 days; synthetic.
- `ride_requests_simulated.csv`: 10,616 synthetic requests; if outcome unavailable status is `HISTORICAL_UNKNOWN`.
- `belagavi_roads.graphml` / `belagavi_pois.csv`: NOT included, can be retrieved from OSM when running extraction.
- `zones.geojson`: validated zone polygons NOT available from starter pack. Do not label generated buffer circles as verified zones.

### Data hygiene and integrity checks

- Unique passenger email, driver userId, source ride ID and offer attempt key.
- For live rides: `requestedAt <= acceptedAt <= startedAt <= completedAt` when fields present.
- No driver `BUSY` or `RESERVED` without activeRideId.
- A driver can only be atomically reserved when `status=AVAILABLE && activeRideId=null`.
- `Ride.source=SYNTHETIC_HISTORY` never joins live allocation queue.
- `pool.passengerCount <= vehicle.capacity` and pickup stop precedes corresponding dropoff.
- All local-hour and weekday features use Asia/Kolkata; timestamps stored as UTC instants.
- No train/test leakage: use a forward-in-time holdout and record synthetic provenance.
- Show live and synthetic historical statistics separately in final dashboard.
