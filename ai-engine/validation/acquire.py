"""One cached city-centre Overpass request. © OpenStreetMap contributors, ODbL."""
from pathlib import Path
import osmnx as ox

out = Path(__file__).with_name("belagavi.graphml")
if not out.exists():
    ox.settings.cache_folder = out.parent / ".cache"
    ox.settings.http_user_agent = "RideSyncAI-research/1.0 (github.com/Gagandeep-p-h/RideSyncAI)"
    graph = ox.graph_from_point((15.8497,74.4977), dist=3000, network_type="drive", simplify=False)
    graph = ox.routing.add_edge_speeds(graph, fallback=25)
    graph.graph.update(network_type="drive",source="OPENSTREETMAP", attribution="© OpenStreetMap contributors, ODbL")
    ox.save_graphml(graph,out)
