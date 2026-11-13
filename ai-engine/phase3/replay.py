"""Chronological dispatch replay. Times in minutes from first request."""
import argparse
import csv
import json
import math
import statistics
import sys
from collections import Counter
from datetime import datetime
from functools import lru_cache
from pathlib import Path

import networkx as nx

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"phase1"))
import roads

POLICIES = ("nearest","eta","weighted","constrained")


class Travel:
    def __init__(self):
        self.graph = roads.load(ROOT/"validation/belagavi.graphml")

    @lru_cache(maxsize=65536)
    def node(self, point):
        x,y = roads.coordinate(*point)
        if 74.493 <= x <= 74.503 and 15.845 <= y <= 15.855:
            try:
                return roads.snap(self.graph,point)
            except ValueError:
                pass
        return None

    @lru_cache(maxsize=32768)
    def road(self,a,b):
        path = nx.shortest_path(self.graph,a,b,weight="hours")
        edges = [min(self.graph[u][v].values(), key=lambda e:e["hours"]) for u,v in zip(path,path[1:])]
        return (nx.shortest_path_length(self.graph,a,b,weight="km"),sum(e["km"] for e in edges),
                60*sum(e["hours"] for e in edges),"road")

    def leg(self,a,b):
        u,v = self.node(a),self.node(b)
        if u is not None and v is not None:
            try:
                return self.road(u,v)
            except nx.NetworkXNoPath:
                pass
        km = roads.metres(a,b)*1.35/1000
        return km,km,60*km/22,"estimate"


def read(name):
    with (ROOT/"data/raw"/name).open() as f:
        return list(csv.DictReader(f))


def choose(options,policy,penalty):
    fastest = min(c["eta"] for c in options)
    for c in options:
        idle = min(1,c["idle"]/60)
        if policy=="weighted":
            c["score"] = .65/(1+c["eta"]/5)+.25*idle+.1/(1+c["completed"])
        else:
            c["score"] = .45*idle+.2*c["acceptance"]  # workload priority applied within ETA cap
    if policy=="nearest":
        return min(options,key=lambda c:(c["distance"],c["eta"],c["id"]))
    if policy=="eta":
        return min(options,key=lambda c:(c["eta"],c["id"]))
    eligible = options if policy=="weighted" else [c for c in options if c["eta"]<=fastest+penalty]
    if policy=="constrained":
        return min(eligible,key=lambda c:(c["assigned"],-c["score"],c["eta"],c["id"]))
    return min(eligible,key=lambda c:(-c["score"],c["eta"],c["id"]))


def percentile(series,p):
    values=sorted(series)
    return values[max(0,math.ceil(p*len(values))-1)] if values else None


def simulate(requests,drivers,travel,policy,penalty):
    fleet = {}
    for d in drivers:
        if d["available"]=="True":
            fleet[d["driver_id"]] = dict(point=(float(d["longitude"]),float(d["latitude"])),vehicle=d["vehicle_type"],
                free=-float(d["idle_minutes"]),assigned=0,completed=int(d["completed_rides"]),
                busy=0.,acceptance=float(d["acceptance_rate"]),pending=None)
    first=datetime.fromisoformat(requests[0]["pickup_time"])
    waits,idles,samples=[],[],[]
    coverage=Counter()
    km=fuel=0.
    for r in requests:
        now=(datetime.fromisoformat(r["pickup_time"])-first).total_seconds()/60
        vehicle=r["vehicle_type"]
        pickup=(float(r["pickup_lon"]),float(r["pickup_lat"]))
        dest=(float(r["dropoff_lon"]),float(r["dropoff_lat"]))
        options=[]
        for key,d in fleet.items():
            if d["free"]>now:
                continue
            if d["pending"] is not None:
                d["point"]=d["pending"]
                d["pending"]=None
                d["completed"]+=1
            if d["vehicle"]!=vehicle:
                continue
            dist,actual,eta,source=travel.leg(d["point"],pickup)
            options.append(dict(id=key,distance=dist,km=actual,eta=eta,source=source,idle=now-d["free"],
                assigned=d["assigned"],completed=d["completed"],acceptance=d["acceptance"]))
        if not options:
            continue
        c=choose(options,policy,penalty)
        d=fleet[c["id"]]
        _,_,ride,src=travel.leg(pickup,dest)
        duration=c["eta"]+ride
        d.update(free=now+duration,pending=dest,assigned=d["assigned"]+1,busy=d["busy"]+duration)
        coverage["pickup_"+c["source"]]+=1
        coverage["trip_"+src]+=1
        km+=c["km"]
        economy,allowance=roads.FUEL[vehicle]
        fuel+=c["km"]/economy+c["eta"]/60*allowance
        waits.append(c["eta"])
        idles.append(c["idle"])
        if len(samples)<3:
            samples.append(dict(request=r["ride_id"],assignmentMinute=now,pickupMinute=now+c["eta"],
                completionMinute=d["free"],fastestETA=min(o["eta"] for o in options),choice=c))
    end=max(now,max(d["free"] for d in fleet.values()))
    for d in fleet.values():
        if d["pending"] is not None:
            d.update(point=d["pending"],pending=None,completed=d["completed"]+1)
    counts={k:d["assigned"] for k,d in fleet.items()}
    completed=sum(d["completed"]-int(r["completed_rides"]) for r in drivers if (d:=fleet.get(r["driver_id"])))
    return dict(served=len(waits),unserved=len(requests)-len(waits),completed=completed,
        completionRate=completed/len(requests),meanETA=statistics.mean(waits),p95ETA=percentile(waits,.95),
        emptyKm=km,pickupLitres=fuel,assignments=counts,jain=sum(counts.values())**2/(len(counts)*sum(n*n for n in counts.values())),
        utilization=sum(d["busy"] for d in fleet.values())/(end*len(fleet)),
        utilizationByDriver={k:d["busy"]/end for k,d in fleet.items()},
        idleMinutesAtAssignment={str(p):percentile(idles,p) for p in [.1,.5,.9,.95]},
        idleMinutesByDriver={k:end-d["busy"] for k,d in fleet.items()},coverage=coverage,samples=samples)


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--eta-penalty",type=float,default=1.)
    args=parser.parse_args()
    if not math.isfinite(args.eta_penalty) or args.eta_penalty<0:
        parser.error("Penalty must be finite and nonnegative")
    requests=sorted(read("ride_requests_simulated.csv"),key=lambda r:(r["pickup_time"],r["ride_id"]))
    drivers=read("drivers_simulated.csv")
    travel=Travel()
    coverage={}
    for label,rows,x,y in [("drivers",drivers,"longitude","latitude"),("pickup",requests,"pickup_lon","pickup_lat"),
                            ("dropoff",requests,"dropoff_lon","dropoff_lat")]:
        coverage[label]=dict(total=len(rows),snappable=sum(travel.node((float(r[x]),float(r[y]))) is not None for r in rows))
    result=dict(source="SYNTHETIC",maxETAPenaltyMinutes=args.eta_penalty,coverage=coverage,
                policies={p:simulate(requests,drivers,travel,p,args.eta_penalty) for p in POLICIES})
    print(json.dumps(result,indent=2))

if __name__=="__main__":
    main()
