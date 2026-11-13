"""One-off offline road-network route calculation using the previously downloaded GraphML.
Returns road-based distance and a speed-assumption ETA; NO measured traffic speed.

python route_distance.py --graph data/osm/belagavi_roads.graphml \
  --start-lat 15.85 --start-lng 74.49 --end-lat 15.86 --end-lng 74.50
"""
import argparse,json,math
import osmnx as ox
import networkx as nx
p=argparse.ArgumentParser()
p.add_argument('--graph',required=True)
p.add_argument('--start-lat',type=float,required=True)
p.add_argument('--start-lng',type=float,required=True)
p.add_argument('--end-lat',type=float,required=True)
p.add_argument('--end-lng',type=float,required=True)
p.add_argument('--assumed-speed-kmh',type=float,default=22.0)
a=p.parse_args()
if a.assumed_speed_kmh<=0:raise ValueError('assumed speed must be >0')
G=ox.load_graphml(a.graph)
s=ox.distance.nearest_nodes(G,X=a.start_lng,Y=a.start_lat)
t=ox.distance.nearest_nodes(G,X=a.end_lng,Y=a.end_lat)
def heuristic(n,goal):
    return ox.distance.great_circle(G.nodes[n]['y'],G.nodes[n]['x'],G.nodes[goal]['y'],G.nodes[goal]['x'])
try:
    path=nx.astar_path(G,s,t,heuristic=heuristic,weight='length')
    length=0.0
    for u,v in zip(path[:-1],path[1:]):
        length+=min(edge.get('length',math.inf) for edge in G[u][v].values())
    print(json.dumps({'distanceKm':round(length/1000,3),'estimatedMinutes':round((length/1000)/a.assumed_speed_kmh*60,1),
       'roadNodes':len(path),'routeLine':[[G.nodes[n]['y'],G.nodes[n]['x']] for n in path],
       'distanceSource':'OSM_GRAPH_ASTAR','etaSource':'ASSUMED_SPEED_NOT_LIVE_TRAFFIC'}))
except nx.NetworkXNoPath:
    print(json.dumps({'error':'NO_ROUTABLE_PATH','startNode':s,'endNode':t}))
