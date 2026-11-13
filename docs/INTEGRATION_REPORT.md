# Maps and booking integration

Integrated `origin/main` at `77bdb5b` (authenticated backend) and `origin/feature/backend-booking` at `fff2b3e` (Leaflet cab simulation) with the preserved cinematic frontend. No separate maps branch was present. Merge commits preserve both histories; duplicated backend changes were resolved in favor of the canonical authenticated implementation.

Shared RideContext connects pickup/drop-off, real OSRM routing, passenger count, route preferences, simulation and tracking across navigation. Backend mode uses JWT APIs for registration, login, booking, polling, cancellation and history. CaptainDashboard uses actual offers and lifecycle endpoints. No fabricated backend responses or live driver GPS are displayed. Eco is explicitly a shortest-route proxy, and fare/fuel calculations are labeled estimates.

Key files: frontend/src/context/RideContext.jsx, components/maps/RideMap.jsx, services/{api,ride-utils}.js, pages/{Booking,Tracking,CaptainDashboard,Activity,Profile}.jsx, pages/auth/RoleLogin.jsx, index.css, tailwind.config.js. Backend integration changes are in app/server, routes/demo.routes.js, models/booking.js, services/matching/dispatch.js, scripts/demo.js and tests.

Palette: ink #111C21, slate #263B43, teal #477781, sea glass #A8C5BF, porcelain #F2F3EF, muted #899B9F. Shared CSS variables drive Tailwind and cinematic aliases. Orange/amber decorative styles were replaced. Semantic error/success colors and third-party map imagery retain their meaning.

The optional transactional demo is isolated at /api/demo with separate collections and explicit opt-in. Canonical /api remains authenticated. Local startup and environment templates are documented in LOCAL_SETUP.md and backend/README.md.

Validation: 32 backend tests pass without skips; 3 frontend tests pass; production build passes; lint passes with 11 warnings (React/compiler guidance around imperative Three.js state, effect state and context exports). Browser verification confirmed map tiles, coordinate selection, real road route and simulation tracking. Backend lifecycle tests exercise auth, Socket.IO authorization, reassignment, concurrent acceptance, completion and cancellation. Exact mobile-device and browser-console verification were unavailable in this managed browser; responsive styles are implemented but those checks remain unverified. WebGL is unavailable here, so the static cinematic fallback was verified instead.

Operational limits: public OSRM/OSM require network availability; demo matching/movement is explicitly simulated; backend driver accounts need provisioning; frontend auth/state resets on reload. Production bundle reports large chunks, including the lazy Three.js scene. No deployment or real ride booking was performed.
