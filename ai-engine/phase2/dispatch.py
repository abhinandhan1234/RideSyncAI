"""Offline decision support. Supply is a caller-supplied snapshot; fares are simulated INR."""
import csv
import itertools
import json
import math
import sys
from collections import Counter
from pathlib import Path

import networkx as nx

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/"phase1"))
import demand
import roads


def zones(hour, available):
    """One available driver is assumed to serve four requests in the forecast hour."""
    if any(z not in demand.ZONES or type(n) is not int or n < 0 for z,n in available.items()):
        raise ValueError("Invalid canonical supply")
    rows = []
    for row in demand.forecast(demand.OUT, hour)[:8]:
        zone = row["zone"]
        supply = available.get(zone, 0)
        required = math.ceil(row["demand"]/4)
        ratio = row["demand"] / max(1, 4*supply)
        surge = 1.6 if ratio >= 3 else 1.35 if ratio >= 2 else 1.15 if ratio >= 1 else 1
        rows.append(dict(zone=zone, demand=row["demand"], available=supply, required=required,
                         surge=surge, deficit=required-supply))
    surplus = {r["zone"]:-r["deficit"] for r in rows if r["deficit"]<0}
    moves = []
    for target in sorted(rows,key=lambda r:-r["deficit"]):
        need = target["deficit"]
        for donor in sorted(surplus,key=lambda z:-surplus[z]):
            count = min(need,surplus[donor])
            if count > 0:
                moves.append(dict(origin=donor,target=target["zone"],drivers=count,
                                  reason=f"{donor} has {surplus[donor]} spare; {target['zone']} needs {need}"))
                surplus[donor] -= count
                need -= count
    return dict(hour=hour,zones=rows,reposition=moves)


def allocation(graph,pickup,drivers):
    choices = []
    for driver in drivers:
        if not driver["available"]:
            continue
        try:
            trip = roads.route(graph,driver["point"],pickup,"fastest")
            nearest = roads.route(graph,driver["point"],pickup,"shortest")
        except (nx.NetworkXNoPath, ValueError):
            continue
        eta = trip["etaMinutes"]
        idle = min(1,max(0,driver["idleMinutes"]/60))
        workload = 1/(1+max(0,driver["completedTrips"]))
        score = .65/(1+eta/5) + .25*idle + .10*workload
        choices.append(dict(driver=driver["id"],etaMinutes=eta,roadKm=nearest["distanceKm"],
                            idleMinutes=driver["idleMinutes"],completedTrips=driver["completedTrips"],score=score))
    ranked = sorted(choices,key=lambda c:(-c["score"],c["driver"]))
    nearest = min(choices,key=lambda c:(c["roadKm"],c["driver"]),default=None)
    return dict(ranked=ranked,selected=ranked[0] if ranked else None,nearest=nearest,
                extraPickupMinutes=ranked[0]["etaMinutes"]-nearest["etaMinutes"] if ranked else None)


def fare(km,minutes):
    return 40+12*km+2*minutes


def pool(graph, requests, capacity=4, max_detour=.25):
    """Two parties ready now. First pickup starts the clock; no approach or dwell allowance.
    Minimize vehicle time. Split the shared meter proportional to standalone fares.
    """
    if len(requests)!=2 or capacity<1 or not math.isfinite(max_detour) or max_detour<0:
        raise ValueError("Invalid pooling limits")
    seats = [r["seats"] for r in requests]
    if any(type(n) is not int or n<1 for n in seats):
        raise ValueError("Invalid party size")
    points = [p for r in requests for p in (r["pickup"],r["dropoff"])]
    cache = {}
    def leg(i,j):
        key = (i,j)
        if key not in cache:
            cache[key] = roads.route(graph,points[i],points[j],"fastest")
        return cache[key]
    try:
        direct = [leg(0,1),leg(2,3)]
    except (nx.NetworkXNoPath,ValueError):
        return dict(feasible=False,reason="Unroutable separate trip")
    direct_fares = [fare(r["distanceKm"],r["etaMinutes"]) for r in direct]
    separate = dict(minutes=sum(r["etaMinutes"] for r in direct),fareINR=round(sum(direct_fares),2))
    best = None
    if sum(seats)<=capacity:
        for first,second in [(0,2),(2,0)]:
            for drops in itertools.permutations([1,3]):
                order = (first,second,*drops)
                km = minutes = 0
                times = {first:0}
                try:
                    for i,j in zip(order,order[1:]):
                        trip = leg(i,j)
                        km += trip["distanceKm"]
                        minutes += trip["etaMinutes"]
                        times[j] = minutes
                except (nx.NetworkXNoPath,ValueError):
                    continue
                rides = [times[i+1]-times[i] for i in (0,2)]
                if any(t > d["etaMinutes"]*(1+max_detour)+1e-8 for t,d in zip(rides,direct)):
                    continue
                total = round(fare(km,minutes),2)
                share = round(total*direct_fares[0]/sum(direct_fares),2)
                candidate = dict(order=[["pickup1","drop1","pickup2","drop2"][i] for i in order],
                                 minutes=minutes,distanceKm=km,fareINR=total,
                                 passengers=[dict(waitMinutes=times[i*2],rideMinutes=rides[i],
                                    separateMinutes=direct[i]["etaMinutes"],separateFareINR=round(direct_fares[i],2),
                                    pooledFareINR=[share,round(total-share,2)][i]) for i in range(2)])
                if best is None or (minutes,km)<(best["minutes"],best["distanceKm"]):
                    best = candidate
    return dict(feasible=best is not None,separate=separate,pooled=best)


if __name__ == "__main__":
    graph = roads.load(roads.FIXTURE)
    a,c,d = [graph.nodes[n]["point"] for n in "ACD"]
    with (ROOT/"data/raw/drivers_simulated.csv").open() as stream:
        supply = Counter(r["zone_id"] for r in csv.DictReader(stream) if r["available"].lower()=="true")
    drivers = [dict(id="A",point=a,available=True,idleMinutes=60,completedTrips=0),
               dict(id="C",point=c,available=True,idleMinutes=0,completedTrips=5)]
    print(json.dumps(dict(source="SYNTHETIC",zoneIntelligence=zones("2026-11-13 09:00",supply),
                     allocation=allocation(graph,d,drivers),pool=pool(graph,[
                     dict(pickup=a,dropoff=d,seats=1),dict(pickup=c,dropoff=d,seats=1)])),indent=2))
