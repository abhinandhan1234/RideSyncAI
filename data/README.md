# RideSync AI — Data Directory

This directory holds all data artefacts used by the AI engine and backend.

> [!CAUTION]
> **All data in this directory is SYNTHETIC.** It does **not** represent real Belagavi operational data,
> real users, real driver activity, or real revenue figures. It is generated purely for simulation,
> development, and testing purposes.

---

## Sub-directories

### `synthetic/`
Machine-generated demand, driver activity, and zone datasets used for:
- Training and validating the demand forecasting model
- Testing the driver allocation and ride-pooling algorithms
- Populating CityLab simulation scenarios

Typical files:
- `demand_by_zone_hour.csv` — hourly request counts per zone (synthetic)
- `driver_sessions.csv` — simulated driver online/offline events
- `zone_metadata.csv` — zone boundary centroids and labels

### `osm/`
OpenStreetMap road-graph exports produced by **OSMnx**. Used by the routing engine.

Typical files:
- `belagavi_roads.graphml` — full road network for Belagavi (download via OSMnx)
- `belagavi_roads_drive.gpkg` — drive-network GeoPackage subset

> [!NOTE]
> These files are **not committed** (they can be large). Generate them with:
> ```python
> import osmnx as ox
> G = ox.graph_from_place("Belagavi, Karnataka, India", network_type="drive")
> ox.save_graphml(G, filepath="data/osm/belagavi_roads.graphml")
> ```

### `samples/`
Small, hand-curated CSV files (< 500 rows) used for:
- Unit tests in `ai-engine/tests/`
- Quick `inspect_data.py` smoke checks
- CI pipeline validation

---

## Labelling Convention

Every synthetic file should include a header comment or a `source` column with the value `"SYNTHETIC"`.
Never mix synthetic rows with real operational data in the same file.
