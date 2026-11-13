# RideSync AI — Test & Quality Assurance Plan

This document outlines the testing strategy, test cases, automated suites, and manual verification criteria across all layers of the RideSync AI system.

---

## Testing Strategy Matrix

| Category | Tooling | Target | Status |
|---|---|---|---|
| **Backend Unit Tests** | Node.js built-in `node:test` + `node:assert` | Express routes, middleware, utility helpers | ✅ Active (Health tests passing) |
| **Backend Integration Tests** | `node:test` + MongoDB in-memory / local | Database CRUD, atomic driver claim, offer timeouts | Planned |
| **Algorithm Unit Tests** | `node:test` / Python `unittest` | Scoring formula, Hungarian matching, route insertion | Planned |
| **ML Model Evaluation** | Python `scikit-learn` metrics | Chronological MAE/RMSE vs baseline | Planned |
| **End-to-End API Tests** | `curl` / Supertest | Complete booking to completion lifecycle | Planned |
| **Geospatial Integrity** | MongoDB GeoJSON queries | `2dsphere` distance and bounds validation | Planned |

---

## Detailed Test Cases

### 1. Backend & Server Health
- **TEST-BE-01: Health Endpoint Response**
  - *Method*: `GET /api/health`
  - *Expected*: HTTP 200, `{ status: "ok", service: "RideSync AI Backend" }`
  - *Execution*: Unit test passing via `npm test` in `backend/`.
- **TEST-BE-02: Unknown Route Handling**
  - *Method*: `GET /api/nonexistent`
  - *Expected*: HTTP 404, `{ error: "Route not found" }`
- **TEST-BE-03: MongoDB Connection Resilience**
  - *Condition*: Database down or invalid URI.
  - *Expected*: Server reports database status without crashing HTTP health listener.

### 2. Data Validation & Inspection
- **TEST-DATA-01: CSV Inspection Utility**
  - *Script*: `python3 ai-engine/inspect_data.py`
  - *Condition A (No file)*: Gracefully displays missing file guide with expected columns.
  - *Condition B (File present)*: Outputs rows, columns, null value breakdown, and date ranges.

### 3. ML Model Evaluation
- **TEST-ML-01: Chronological Holdout Split**
  - *Verification*: Training set strictly precedes test set timestamps (no future leakage).
- **TEST-ML-02: Baseline Outperformance**
  - *Criterion*: Gradient Boosting `MAE_test` must be strictly lower than `MAE_time_of_day_baseline`.

### 4. Matching & Allocation Engine
- **TEST-DISPATCH-01: Driver Scoring Determinism**
  - *Inputs*: Mock drivers with known coordinates and metrics.
  - *Expected*: Nearest, highest-acceptance, longest-idle driver receives highest score.
- **TEST-DISPATCH-02: Atomic Driver Claiming (Concurrency Prevention)**
  - *Condition*: Two simultaneous ride requests matching the same single driver.
  - *Expected*: One ride successfully reserves the driver; the other falls back to candidate #2 without race condition.

### 5. Ride Lifecycle & Reassignment
- **TEST-LIFECYCLE-01: Standard Happy Path**
  - *Sequence*: `REQUESTED` → `OFFERED` → `ACCEPTED` → `ARRIVING` → `ONGOING` → `COMPLETED`.
- **TEST-REASSIGN-01: Driver Reject Flow**
  - *Action*: Driver explicitly rejects offer.
  - *Expected*: Driver released to `AVAILABLE`; next ranked driver offered ride; attempt counter increments.
- **TEST-REASSIGN-02: Offer Timeout Flow**
  - *Action*: Driver does not respond within 20 seconds.
  - *Expected*: Offer marked `EXPIRED`; next driver in queue selected automatically.
- **TEST-REASSIGN-03: Max Attempts Exhaustion**
  - *Condition*: 4 successive rejections or timeouts.
  - *Expected*: Ride transitions to `FAILED` with friendly notification to passenger.

### 6. Pooling & Routing
- **TEST-POOL-01: Seat Capacity Enforcement**
  - *Condition*: 4-passenger ride requested on vehicle with 3 available seats.
  - *Expected*: Pooling rejected; individual dispatch selected.
- **TEST-POOL-02: Max Detour Constraint**
  - *Condition*: Combined route increases first passenger's trip duration by > 30%.
  - *Expected*: Route combination flagged incompatible.
- **TEST-ECO-01: EcoRoute vs Fastest Route Comparison**
  - *Verification*: EcoRoute produces equal or lower estimated fuel consumption than shortest/fastest variants.

