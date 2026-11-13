"""Convert the bounded OSM API extract to a directed motor-road graph."""
from pathlib import Path
import xml.etree.ElementTree as ET
import osmnx as ox

root = Path(__file__).resolve().parent
tree = ET.parse(root/".cache-map.osm")
for way in list(tree.getroot().findall("way")):
    tags = {tag.get("k"):tag.get("v") for tag in way.findall("tag")}
    highway = tags.get("highway","").removesuffix("_link")
    access = next((tags[k] for k in ("motorcar","motor_vehicle","vehicle","access") if k in tags),"yes")
    if highway not in {"motorway","trunk","primary","secondary","tertiary","unclassified","residential","living_street","service"} or access in {"no","private"} or tags.get("area")=="yes":
        tree.getroot().remove(way)
cache = root/".cache"
cache.mkdir(exist_ok=True)
tree.write(cache/"roads.osm",encoding="utf-8")
g = ox.graph_from_xml(cache/"roads.osm",simplify=False,retain_all=False)
g = ox.routing.add_edge_speeds(g,fallback=25)
g.graph.update(network_type="drive",source="OPENSTREETMAP",attribution="© OpenStreetMap contributors, ODbL")
ox.save_graphml(g,root/"belagavi.graphml")
