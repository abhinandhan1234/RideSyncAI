"""Acquire one Belagavi driving graph from the 2026-11-01 OSM snapshot (requires OSMnx 2.x)."""
import sys
from pathlib import Path

if __name__ == "__main__":
    import osmnx as ox
    out = Path(sys.argv[1])
    if out.exists():
        raise FileExistsError(out)
    ox.settings.overpass_settings = '[out:json][timeout:{timeout}][date:"2026-11-01T00:00:00Z"]{maxsize}'
    ox.settings.use_cache = False
    graph = ox.graph_from_point((15.8497,74.4977), dist=9000, network_type="drive", simplify=False, retain_all=True)
    graph.graph.update(network_type="drive",source="OPENSTREETMAP")
    graph = ox.routing.add_edge_speeds(graph, fallback=25)
    ox.save_graphml(graph,out)
