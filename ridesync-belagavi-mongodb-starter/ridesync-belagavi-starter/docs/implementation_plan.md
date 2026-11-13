# 18-hour critical path: four-team assignment

| Owner | Hours 0–3 | Hours 3–7 | Hours 7–13 | Hours 13–18 |
|---|---|---|---|---|
| 1: backend lead | Run MongoDB, models, validate seed; align API contracts | Extend booking/dispatch/reassignment, transaction guards | Wire matching fairness and batch-preview; concurrency tests | Integration, live demo, review |
| 2: frontend lead | Vite, Tailwind, Leaflet; component shell | Passenger map, booking and tracking flows | Pooling UI, driver selection explanation, mock/loading/error states | Polish, deploy, rehearse |
| 3: data/ML lead | Align starter CSV aliases, import, run validation | OSMnx roads and POIs, identify verified polygons if time | Train model, evaluate against baseline, persist forecasts, surge/reposition | Dashboard metrics, experiment reproducibility |
| 4: driver/QA lead | Driver UI and auth, run smoke setup | Driver availability, requests, accept/reject, Socket.IO | Simulate rejection, timeout, cancellation, reassignment, admin dashboard | End-to-end tests, deployed backup, pitch |

## Demo-critical path (MVP)

1. `npm run seed:demo`; log in as demo passenger and driver.
2. Show 40 fictional drivers on Leaflet map with correct GeoJSON conversion.
3. Create booking, observe driver offer on other device/browser.
4. Reject, watch automatic reassignment and new offer.
5. Accept, advance status ARRIVING → IN_PROGRESS → COMPLETED.
6. Show demand history vs forecast, surge/reposition preview, pooling preview.
7. Show honest baseline-vs-optimized comparison computed on identical synthetic scenarios.

## Minimum algorithm experiments

- Nearest driver baseline (min pickup Haversine or network road length).
- Weighted single-request dispatch = distance 30% + pickup ETA 25% + idle fairness 20% + workload fairness 15% + acceptance 10%.
- Batch preview: Hungarian matching on the weighted cost matrix (one driver per ride; incompatible edges cost=1e6).
- Forecast: chronological final-week holdout. Report MAE (and baseline MAE), NOT invented percent improvements.
- Pooling: same direction/nearby pickup/drop prefilter then route insertion with max detour and vehicle capacity for confirmed implementation.
- Repositioning: demand-supply shortages by zone and greedy candidate moves; do not strand high-demand origin zones.
- Reassignment: explicit finite-state transition and driver reservation/offer timeout.

## Go/no-go checkpoints

- Hour 3: real starter data imported (or smoke fallback clearly labeled), APIs launch.
- Hour 7: one booking-to-completion demo WORKS and is recorded.
- Hour 13: 5 advanced feature demos at least preview/working status honestly explained.
- Hour 16: feature freeze, hosting, snapshots and fallback recording.
- Hour 18: rehearsed judging demo and traceable technical claims.

## Critical constraints

Never fabricate real local trip volumes. Verify zone boundaries independently; distinguish geometry from approximate operational circles. Show exact dataset provenance. Design for reproducible random seeds, explicit IDs and no overlapping driver reservations.
