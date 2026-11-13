# Instructions for AI Coding Agents Working on RideSync AI

Welcome to **RideSync AI — Belagavi**. As an AI assistant or autonomous coding agent collaborating on this codebase, you must adhere strictly to the following architectural, safety, and code quality rules:

---

## 1. Safety & Workspace Integrity
1. **Never delete, overwrite, rename, or relocate existing files** without explicit instruction from the user.
2. **Preserve `ridesync-belagavi-starter/`**: This directory contains the reference prototype and mock data schemas. It must remain intact as an operational reference.
3. **Preserve Frontend Work**: Teammate 3 and 4 may be actively developing inside `frontend/`. Do not clobber component files, styles, or configuration.
4. **Never Commit Secrets**: Do not write real passwords, JWT secrets, or production database URIs into code. Always use environment variables via `.env` and `.env.example`.
5. **No Blind External Calls**: Do not run unverified package installs or bulk OSM tile/graph queries without checking local availability first.

---

## 2. Architectural Conventions
1. **Follow `docs/API_CONTRACTS.md`**: Do not arbitrarily change endpoint signatures, query parameter keys, or response payloads. If a contract modification is required, update documentation first.
2. **Follow `docs/DATABASE_SCHEMA.md`**: Adhere to Mongoose models, GeoJSON conventions (`[longitude, latitude]` coordinates), and indexing requirements (`2dsphere` on location fields).
3. **Respect Team Ownership**: Refer to `docs/TEAM_TASKS.md` to identify which module you are extending. Keep AI/ML logic in `ai-engine/`, server/database in `backend/`, and presentation in `frontend/`.
4. **Separation of Concerns**: ML model training and data preprocessing must remain strictly decoupled from real-time Node.js Express request paths.

---

## 3. Data Integrity & Scientific Rigor
1. **Never Fabricate ML Results**: Do not hardcode fictitious `R²`, `MAE`, or `RMSE` metrics. If a model has not been trained on historical data, label it clearly as *Untrained / Synthetic Baseline*.
2. **Label Synthetic Fixtures**: Any generated demand data, mock driver coordinates, or simulated trips must carry the `source: "SYNTHETIC"` or `isSynthetic: true` flag.
3. **No Temporal Data Leakage**: In predictive forecasting models, never use random K-fold splits. Always use chronological holdout splits (e.g., train on first 21 days, evaluate on last 7 days).

---

## 4. Testing & Verification
1. Every newly implemented endpoint or utility must be accompanied by unit or integration tests in `backend/tests/` or `ai-engine/tests/`.
2. Ensure `npm test` inside `backend/` passes before completing any backend task.
3. Test edge cases explicitly: concurrent booking attempts, driver offer timeouts, zero available drivers, and invalid latitude/longitude ranges.

