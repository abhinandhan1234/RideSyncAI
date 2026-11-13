# RideSync AI — AI Engine

The `ai-engine/` directory contains the Python AI/ML engine powering RideSync AI's intelligent features:
demand forecasting, road-network routing, driver–passenger matching optimisation, and EcoDispatch scoring.

---

## Purpose

| Module | Responsibility |
|---|---|
| `forecasting/` | Gradient-Boosting demand prediction per zone per hour |
| `routing/` | Shortest / fastest / eco route computation on the OSMnx road graph |
| `optimization/` | Weighted driver allocation, Hungarian-algorithm batch assignment, ride pooling |
| `evaluation/` | Model evaluation scripts, offline backtesting, metric reporting |

---

## Setup

```bash
# 1. Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 2. Install all dependencies
pip install -r requirements.txt
```

> [!NOTE]
> `osmnx` and `geopandas` require GDAL/GEOS system libraries.
> On macOS: `brew install gdal`. On Ubuntu: `sudo apt install gdal-bin libgdal-dev`.

---

## Inspecting Your Data

```bash
python inspect_data.py
```

The script scans candidate directories for `.csv` files and prints:
- Shape, column names, dtypes
- Missing value counts per column
- Duplicate row count
- Date/timestamp range (if applicable)
- Numeric summary statistics (`df.describe()`)

**Where to place data:**

| Location | Purpose |
|---|---|
| `ai-engine/data/raw/` | Raw historical demand CSVs from operations |
| `../data/synthetic/` | Machine-generated demand / zone / driver datasets |
| `../data/samples/` | Small sample files for unit tests |
| `../../ridesync-belagavi-starter/sample_data/` | Reference starter data (read-only) |

**Expected CSV columns** (flexible — not all are required):

| Column | Description |
|---|---|
| `date` / `timestamp` | Observation timestamp |
| `zone_id` / `zone_code` | Zone identifier |
| `hour` | Hour of day (0–23) |
| `day_of_week` | 0 = Monday … 6 = Sunday |
| `request_count` | Ride requests in that period |
| `available_drivers` | Online drivers in that period |

---

## Planned Modules

The following are **planned but not yet implemented**:

- **`forecasting/train.py`** — trains and serialises the Gradient Boosting demand model
- **`forecasting/predict.py`** — loads a saved model and returns demand predictions
- **`routing/graph_loader.py`** — downloads and caches the Belagavi road graph via OSMnx
- **`routing/route_engine.py`** — Dijkstra / A* route computation
- **`optimization/allocator.py`** — weighted driver scoring and assignment
- **`optimization/pooling.py`** — ride-pooling route-insertion heuristic

> [!IMPORTANT]
> **Model training is NOT implemented yet.** There are no saved models in `models/`.
> **OSM graph download is NOT implemented yet.** No `belagavi_roads.graphml` exists in `data/osm/`.
> Do not attempt to import these modules until they are populated.

---

## Directory Structure

```
ai-engine/
├── requirements.txt       ← Python dependencies
├── inspect_data.py        ← CSV data diagnostic tool
├── data/
│   ├── raw/               ← raw historical CSVs (place yours here)
│   └── processed/         ← cleaned / feature-engineered files
├── forecasting/           ← demand prediction models
├── routing/               ← OSMnx road-graph routing
├── optimization/          ← driver allocation, pooling
├── evaluation/            ← backtesting and metric scripts
├── models/                ← serialised model artefacts (.pkl / .joblib)
├── outputs/               ← prediction outputs, route exports
└── tests/                 ← unit and integration tests
```
