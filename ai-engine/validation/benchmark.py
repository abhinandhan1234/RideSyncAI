"""Paired dispatch decisions on fixed snapshots. Utilization = fraction of drivers selected."""
import json
import statistics
import sys
from collections import Counter
from pathlib import Path
import networkx as nx

HERE = Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parent/"phase2"))
from dispatch import allocation, roads

def run(graph, count=32):
    import random
    rng = random.Random(42)
    component = max(nx.strongly_connected_components(graph),key=len)
    nodes = sorted(component)
    if len(nodes)<4:
        nodes = sorted(max(nx.weakly_connected_components(graph),key=len))
    point = lambda n: graph.nodes[n]["point"]
    fleet = [dict(id=str(i),point=point(n),available=True,idleMinutes=rng.randrange(121),
                  completedTrips=rng.randrange(20)) for i,n in enumerate(rng.sample(nodes,min(8,len(nodes))))]
    decisions = []
    for _ in range(count):
        pickup = point(rng.choice(nodes))
        decision = allocation(graph,pickup,fleet)
        for candidate in decision["ranked"]:
            origin = next(d["point"] for d in fleet if d["id"] == candidate["driver"])
            candidate["fastPickupKm"] = roads.route(graph,origin,pickup,"fastest")["distanceKm"]
        decisions.append(decision)
    summaries = {}
    for policy in ("nearest","selected"):
        served = [r[policy] for r in decisions if r[policy]]
        assignments = Counter(r["driver"] for r in served)
        summaries[policy] = dict(meanPickupETA=statistics.mean(r["etaMinutes"] for r in served),
            emptyPickupKm=sum(r["fastPickupKm"] for r in served),
            unserved=count-len(served),assignments={d["id"]:assignments[d["id"]] for d in fleet},
            fractionDriversUsed=len(assignments)/len(fleet),
            selectedIdleMinutes=sorted(r["idleMinutes"] for r in served))
    return summaries

if __name__=="__main__":
    graph = roads.load(HERE/"belagavi.graphml")
    import random
    rng = random.Random(123)
    nodes = sorted(max(nx.strongly_connected_components(graph),key=len))
    examples = []
    for _ in range(4):
        a,b = rng.sample(nodes,2)
        points = [graph.nodes[n]["point"] for n in (a,b)]
        for mode in ["shortest","fastest","eco"]:
            results = [roads.route(graph,*points,mode,algorithm=alg) for alg in ["astar","dijkstra"]]
            field = {"shortest":"distanceKm","fastest":"etaMinutes","eco":"estimatedFuelLitres"}[mode]
            assert results[0][field] == results[1][field]
            examples.append(dict(origin=a,destination=b,**results[0]))
    output = dict(attribution="© OpenStreetMap contributors, ODbL",nodes=len(graph),edges=graph.number_of_edges(),
                  routes=examples,benchmark=run(graph))
    (HERE/"results.json").write_text(json.dumps(output,indent=2))
    print(json.dumps(output["benchmark"]))
