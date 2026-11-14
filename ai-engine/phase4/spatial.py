"""Coordinates use (longitude, latitude); H3 public API uses latitude first."""
from collections import Counter,defaultdict
from functools import lru_cache
from pathlib import Path
import math
import sys
try:
    import h3
except Exception:
    h3 = None
import numpy as np
import networkx as nx
from scipy.sparse.csgraph import dijkstra
from scipy.spatial import cKDTree

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"phase3"))
import replay
roads=replay.roads


@lru_cache(maxsize=100000)
def cell(point,resolution):
    lon,lat=roads.coordinate(*point)
    return h3.latlng_to_cell(lat,lon,resolution)


def neighbors(index,ring):
    return set(h3.grid_disk(index,ring))


def nearby(pickup,drivers,radius,res):
    """Per occupied cell, use the actual members' maximum centre distance.
    Triangle inequality makes this prefilter conservative even across cell boundaries."""
    groups=defaultdict(list)
    for driver in drivers:
        groups[cell(driver["point"],res)].append(driver)
    found=[]
    for key,members in groups.items():
        centre=tuple(reversed(h3.cell_to_latlng(key)))
        bound=max(roads.metres(centre,d["point"]) for d in members)
        if roads.metres(centre,pickup)<=radius*1000+bound+1e-6:
            found.extend(d for d in members if roads.metres(pickup,d["point"])<=radius*1000)
    return found


def histogram(rows,res):
    return Counter((r["zone"],cell(r["point"],res),r["interval"]) for r in rows)


def distribute(forecasts,counts):
    out={}
    for z,value in forecasts.items():
        shares={k:n for (zone,k),n in counts.items() if zone==z}
        for k,n in shares.items():
            out[z,k]=value*n/sum(shares.values())
    return out


def xyz(point):
    x,y=map(math.radians,point)
    return [math.cos(y)*math.cos(x),math.cos(y)*math.sin(x),math.sin(y)]


class Network:
    def __init__(self):
        graph=roads.load(ROOT/"phase4/belagavi.graphml")
        self.graph=graph
        self.nodes=list(graph)
        self.points=[graph.nodes[n]["point"] for n in self.nodes]
        self.tree=cKDTree([xyz(p) for p in self.points])
        simple=nx.DiGraph()
        simple.add_nodes_from(self.nodes)
        for u,v in graph.edges():
            edges=graph[u][v].values()
            fast=min(edges,key=lambda e:e["hours"])
            simple.add_edge(u,v,t=fast["hours"]*60,k=fast["km"],s=min(e["km"] for e in edges))
        self.matrices=[nx.to_scipy_sparse_array(simple,nodelist=self.nodes,weight=w,format="csr").T.tocsr() for w in ("t","s")]
        ids={n:i for i,n in enumerate(self.nodes)}
        self.length={(ids[u],ids[v]):e["k"] for u,v,e in simple.edges(data=True)}

    @lru_cache(maxsize=65536)
    def snap(self,p):
        if not (74.465<=p[0]<=74.527 and 15.805<=p[1]<=15.894): return None
        _,i=self.tree.query(xyz(p))
        return int(i) if roads.metres(p,self.points[i])<=500 else None

    @lru_cache(maxsize=128)
    def costs(self,b):
        eta,pred=dijkstra(self.matrices[0],indices=b,return_predecessors=True)
        shortest=dijkstra(self.matrices[1],indices=b)
        return eta,pred,shortest

    @lru_cache(maxsize=300000)
    def road(self,a,b):
        eta,pred,short=self.costs(b)
        if np.isfinite(eta[a]):
            km=0
            i=a
            while i!=b:
                j=int(pred[i])
                km+=self.length[i,j]
                i=j
            return float(short[a]),km,float(eta[a]),"ROAD"

    def leg(self,p,q):
        a,b=self.snap(p),self.snap(q)
        if a is not None and b is not None:
            result=self.road(a,b)
            if result:return result
        km=roads.metres(p,q)*.00135
        return km,km,km/22*60,"ESTIMATE_ONLY"
