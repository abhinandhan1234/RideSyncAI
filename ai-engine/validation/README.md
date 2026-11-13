Graph and route geometries © OpenStreetMap contributors, licensed under ODbL: https://www.openstreetmap.org/copyright . The retained XML is the map API response for bbox 74.493,15.845,74.503,15.855. Whole ways may extend beyond the box. from_extract.py filters motor roads and OSMnx converts one-way tags to directed edges. No turn-restriction relation modeling. The larger optional Overpass acquisition failed; the supplied GraphML came from the XML.

Run from this directory with OSMnx 2.1.1 and Phase 1 dependencies:
    .venv/bin/python from_extract.py
    OMP_NUM_THREADS=1 .venv/bin/python benchmark.py

Speed uses OSMnx highway-class imputation from maxspeed, with 25 km/h fallback. Fuel litres = km / vehicle economy + hours × allowance. Bike, auto, cab assumptions respectively: 45, 25, 14 km/L and 0.15, 0.3, 0.7 L/h; price 100 INR/L. Zero A* heuristic for all weights. Network travel times and fuel estimates are simulated.

Seed 42 generates 32 independent requests and one shared synthetic snapshot of eight eligible drivers. Both policies travel fastest pickup routes. Nearest ranks by shortest road distance. Utilization here measures fleet participation, not occupied time. Idle values are pre-assignment snapshot values and are not advanced between decisions.
