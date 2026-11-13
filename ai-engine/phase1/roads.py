"""Route on WGS84 directed drive networks. Fuel = cruising litres + time allowance.
Synthetic km/L and litres/hour respectively; assumed common fuel price 100 INR/L.
Acquisition uses unsimplified road segments, preserving bends as intermediate nodes.
"""
import argparse
import json
import math
from pathlib import Path

import networkx as nx
from shapely import wkt

FUEL = {"bike": (45, 0.15), "auto": (25, 0.3), "cab": (14, 0.7)}
FIXTURE = Path(__file__).with_name("offline.graphml")


def coordinate(x,y):
    x,y = float(x),float(y)
    if not (-180 <= x <= 180 and -90 <= y <= 90):
        raise ValueError("Invalid longitude/latitude")
    return x,y


def metres(a,b):
    x,y,u,v = map(math.radians, (*a,*b))
    h = math.sin((v-y)/2)**2 + math.cos(y)*math.cos(v)*math.sin((u-x)/2)**2
    return 12742000 * math.asin(math.sqrt(min(1,h)))


def load(path):
    graph = nx.read_graphml(path, force_multigraph=True)
    if not graph.is_directed() or graph.graph.get("network_type") != "drive" or graph.graph.get("crs","").lower() != "epsg:4326":
        raise ValueError("Expected directed WGS84 drive graph from acquisition script")
    for node,data in graph.nodes(data=True):
        data["point"] = coordinate(data["x"],data["y"])
    if not graph.number_of_edges():
        raise ValueError("Empty road network")
    for u,v,data in graph.edges(data=True):
        length = float(data["length"])
        speed = float(data.get("speed_kph",25))
        if not (math.isfinite(length) and length >= 0 and math.isfinite(speed) and speed > 0):
            raise ValueError("Invalid edge length or speed")
        data.update(km=length/1000, hours=length/1000/speed)
    return graph


def snap(graph, point):
    point = coordinate(*point)
    points = nx.get_node_attributes(graph,"point")
    if any(not min(p[i] for p in points.values()) <= point[i] <= max(p[i] for p in points.values()) for i in (0,1)):
        raise ValueError("Outside graph bounds")
    node = min(points,key=lambda n: metres(point,points[n]))
    if metres(point, points[node]) > 500:
        raise ValueError("No nearby road node")
    return node


def route(graph, origin, destination, mode="shortest", vehicle="cab", algorithm="astar"):
    if vehicle not in FUEL or mode not in ("shortest","fastest","eco") or algorithm not in ("dijkstra","astar"):
        raise ValueError("Unknown vehicle, mode or algorithm")
    economy, allowance = FUEL[vehicle]
    def fuel(edge):
        return edge["km"]/economy + edge["hours"]*allowance
    cost = {"shortest":lambda e:e["km"],"fastest":lambda e:e["hours"],"eco":fuel}[mode]
    def weight(u,v,edges):
        return min(map(cost,edges.values()))
    start,end = snap(graph,origin),snap(graph,destination)
    # Zero is admissible for every validated nonnegative objective, including fuel.
    path = (nx.astar_path(graph,start,end,heuristic=lambda u,v:0,weight=weight) if algorithm=="astar"
            else nx.dijkstra_path(graph,start,end,weight=weight))
    coords = [graph.nodes[start]["point"]]
    km = hours = litres = 0.
    for u,v in zip(path,path[1:]):
        edge = min(graph[u][v].values(),key=cost)
        km += edge["km"]
        hours += edge["hours"]
        litres += fuel(edge)
        if edge.get("geometry"):
            segment = [coordinate(*p) for p in wkt.loads(edge["geometry"]).coords]
            if metres(coords[-1],segment[-1]) < metres(coords[-1],segment[0]):
                segment.reverse()
            coords.extend(segment[1:])
        else:
            coords.append(graph.nodes[v]["point"])
    return dict(mode=mode, vehicle=vehicle, distanceKm=round(km,6), etaMinutes=round(hours*60,6),
                estimatedFuelLitres=round(litres,6), estimatedFuelCostINR=round(litres*100,2),
                geometry=dict(type="LineString",coordinates=coords if len(coords)>1 else coords*2),
                source=graph.graph.get("source","OPENSTREETMAP"))


if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--graph",type=Path,default=FIXTURE)
    p.add_argument("--origin",type=float,nargs=2,default=[74.5,15.85])
    p.add_argument("--destination",type=float,nargs=2,default=[74.51,15.85])
    p.add_argument("--vehicle",choices=FUEL,default="cab")
    a=p.parse_args()
    g=load(a.graph)
    print(json.dumps([route(g,a.origin,a.destination,m,a.vehicle) for m in ("shortest","fastest","eco")],indent=2))
