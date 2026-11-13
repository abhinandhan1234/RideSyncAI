# RideSync AI backend

The canonical authenticated API is mounted at `/api`. It supports passenger registration/login, JWT role authorization, sequential driver dispatch, offers, cancellation, status transitions, ride history and Socket.IO notifications. See `src/routes/booking.routes.js` for the implemented contract and `../docs/INTEGRATION_REPORT.md` for integration details.

## Local startup

Requires Node 24 LTS and npm. From the repository root run `npm run install:local` then `npm run local`. Frontend: http://localhost:5173; backend health: http://localhost:5002/api/health.

Alternatively, from `backend`, run `npm ci` then `npm run demo`. This downloads MongoDB on first use, starts a disposable replica set, generates an ephemeral JWT secret, seeds zone Z01 and three synthetic **transactional demo** drivers. It overrides the database URI without modifying `.env`. Data disappears on exit. Canonical driver accounts are not seeded: passenger registration works, but requests without provisioned drivers terminate unmatched.

For persistence, copy `.env.example` to `.env`, configure MONGODB_URI and a random JWT_SECRET of at least 32 characters, then run `npm start`. Provision canonical users/drivers/zones using `src/models/index.js`. Do not commit credentials. Canonical dispatch retains upstream standalone MongoDB support; a replica set is recommended.

## Isolated transactional demo

`ENABLE_BOOKING_DEMO=true` additionally mounts the earlier unauthenticated API at `/api/demo`. It requires a replica set and uses separate `demo_drivers`, `demo_rides`, and `demo_offers` collections, UUID identifiers and lowercase statuses. It is disabled by default and should remain disabled on public deployments. Its contract is in [docs/API.md](docs/API.md). The frontend backend-booking mode uses the authenticated API, not this demo API.

## Tests

`npm test` starts isolated MongoDB replica sets and does not use your configured database. The suite covers canonical authentication/authorization, Socket.IO access, dispatch and lifecycle races, plus transactional demo rollback, recovery, expiry and AI fallback. All 32 tests pass without skips. If needed, set `MONGOMS_DOWNLOAD_DIR` to a writable cache path.
