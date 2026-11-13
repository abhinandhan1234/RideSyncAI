> Historical cinematic redesign notes. Later auth, booking and map integration supersedes integration-pending statements below; see `../docs/INTEGRATION_REPORT.md`.

## Current cleanup status

The standalone Admin 3D vehicle inspection page and Design System demo remain
removed. The public landing page uses the recovered original, lazy-loaded Three.js
and React Three Fiber scene with the Honda taxi model across Explore and How it
works; the SVG taxi remains its fallback. Driver-facing sign-in and registration use `/sarathi/login` and
`/sarathi/register`; the former Captain login entry point is no longer registered.
The historical notes below describe earlier iterations, not current routes.

# Cinematic landing implementation

Branch: `feature/cinematic-landing`. No commits, pushes, merges or publication
were performed. Existing uncommitted backend changes were retained, and no backend
or dataset files were edited during this frontend task.

## What changed

- `src/pages/CinematicLanding.jsx`: five continuous story chapters, role choices,
  chapter navigation, illustrative route selector and accessible skip link.
- `src/components/cinematic/`: fixed navigation, scoped palette/typography,
  one persistent lazy-loaded R3F canvas, one normalized scroll director, and an
  original static SVG vehicle fallback. Demand rendering stops when interpolation
  settles; background-tab rendering is disabled. Mobile DPR is capped at 1.
- `src/three/vehicleRig.js` and `TaxiModel.jsx`: preserve the original GLB group
  hierarchy and every material mesh. Complete wheel groups are attached to pivots
  at measured bounding-box centers with preserved world transforms. The model is
  grounded at tyre level. Wheels follow travelled distance in the scroll scene.
- `TaxiCamera.jsx` / `TaxiScene.jsx`: wider framing for the original studio page;
  remove the remote HDR dependency and add a WebGL fallback.
- `src/pages/auth/RoleLogin.jsx`: Passenger and Captain entry screens, explicitly
  disabled until authentication is implemented. No invented endpoint or success.
- `src/App.jsx`: public layout at `/`, new `/login/passenger` and `/login/captain`;
  existing `/book`, `/track`, `/activity`, `/profile`, `/3d`, `/design-preview`
  retain application layout. Route changes reset scroll; anchor navigation works.
- `index.html`: updated metadata and mobile zoom allowed.
- `vite.config.js`: local `/api` proxy, default port 5002; configurable through
  the launcher's VITE_API_PROXY environment variable. Existing plugin retained.
- Root `scripts/run-local.mjs`, npm scripts and `LOCAL_SETUP.md`: local setup,
  frontend/backend launcher and standalone/persistent database instructions.

No frontend dependencies were added. The original GLB is unchanged (181 KB).
No new model assets were downloaded. The M-Sport reference HTML was accessible;
only its broad storytelling direction was used, not its assets or source.

## Verification performed

- `npm run build`: PASS. Three.js remains a large lazily loaded chunk (~993 KB
  uncompressed, ~265 KB gzip); the build reports a bundle-size warning.
- `npm run check:vehicle`: PASS. All 12 material mesh bounds preserved, all 3
  axle-group pivots stay centered, 3,278 triangles, +Y up / +Z forward.
- Shared Chromium: inspected all five chapters, changed route priorities,
  followed Passenger and Captain links, and inspected existing Book Ride,
  Tracking, Activity and Profile pages. These views render successfully.
- The cloud browser displayed the SVG fallback instead of WebGL. Animated 3D,
  camera choreography and visual wheel movement are **not browser-verified**.
  Geometry is verified programmatically, not claimed as a rendered 3D result.
- The managed preview relay timed out. Checks used the already-running user-requested
  frontend server in the shared cloud browser. DevTools is blocked by browser
  policy, so console inspection was unavailable. Native resizing did not change
  the browser viewport; exact 390px/768px/1440px/1920px and reduced-motion emulation
  remain unverified. Safari was unavailable.
- Local launcher smoke test: both servers start, frontend returns HTML, backend
  health returns OK, and `/api/health` works through the frontend proxy. Tested
  on Linux/Node 24 with alternate ports 5175/5005 to preserve running previews.
  Windows/macOS execution has not been directly tested.

## Remaining integration

Authentication and a captain dashboard are pending. Existing booking, tracking,
activity and profile screens remain the original demo placeholders. Landing route
choices and city intelligence are labeled illustrative; there is no live traffic,
forecast, fuel savings or route-comparison API integration. Reduced-motion users
receive the stationary SVG and all navigation without the scroll animation.
