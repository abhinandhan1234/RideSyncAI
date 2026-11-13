"""Evaluate overlapping two-party itineraries on Phase 4 fastest road legs."""
import math
from functools import lru_cache
from itertools import permutations

@lru_cache(maxsize=1)
def network():
    from spatial import Network
    return Network()

def plan(p):
    from roads import FUEL, metres
    g=network()
    a,b=p["requests"]
    pts=[tuple(p["origin"]),tuple(a["pickup"]),tuple(b["pickup"]),tuple(a["dropoff"]),tuple(b["dropoff"])]
    if any(g.snap(x) is None for x in pts):
        return dict(feasible=False,source="ESTIMATE_ONLY",reason="Outside road coverage")
    if a["seats"]+b["seats"]>p["capacity"] or metres(pts[1],pts[2])>2500:
        return dict(feasible=False,reason="Capacity or pickup proximity")
    def vector(i):
        x,y=pts[i];u,v=pts[i+2]
        return ((u-x)*math.cos(math.radians(y)),v-y)
    v,w=vector(1),vector(2)
    if sum(x*y for x,y in zip(v,w))<0.5*math.hypot(*v)*math.hypot(*w):
        return dict(feasible=False,reason="Incompatible travel directions")
    economy,allowance=FUEL[p["vehicle"]]
    @lru_cache(None)
    def leg(i,j):
        u,v=g.snap(pts[i]),g.snap(pts[j])
        metrics=g.road(u,v)
        if metrics is None:raise LookupError()
        _,km,t,_=metrics
        _,pred,_=g.costs(v)
        path=[g.points[u]]
        while u!=v:
            u=int(pred[u]);path.append(g.points[u])
        return dict(distanceKm=km,minutes=t,fuelLitres=km/economy+t/60*allowance,coordinates=path)
    def totals(legs):
        return {k:sum(x[k] for x in legs) for k in ("distanceKm","minutes","fuelLitres")}
    def fare(km,t):
        return round(40+12*km+2*math.ceil(t),2)
    try:
        direct=[leg(1,3),leg(2,4)]
        approaches=[leg(0,1),leg(0,2)]
    except LookupError:
        return dict(feasible=False,source="ESTIMATE_ONLY",reason="Disconnected separate route")
    separate=totals(direct+approaches)
    fares=[fare(d["distanceKm"],d["minutes"]) for d in direct]
    separate["fareINR"]=sum(fares)
    best=None
    for drops in permutations([3,4]):
        order=[0,1,2,*drops]  # Preserve the existing offer's first pickup.
        try:legs=[leg(i,j) for i,j in zip(order,order[1:])]
        except LookupError:continue
        metrics=totals(legs)
        elapsed=0;times={}
        for stop,item in zip(order[1:],legs):
            elapsed+=item["minutes"];times[stop]=elapsed
        passengers=[]
        for i,d in enumerate(direct,1):
            ride=times[i+2]-times[i]
            passengers.append(dict(waitMinutes=times[i],rideMinutes=ride,detourMinutes=max(0,ride-d["minutes"]),
                separateWaitMinutes=approaches[i-1]["minutes"],separateMinutes=d["minutes"],separateFareINR=fares[i-1]))
        if any(x["waitMinutes"]>10 or x["detourMinutes"]>p["detour"]*x["separateMinutes"]+1e-8 for x in passengers):continue
        if elapsed>max(d["minutes"]+v["minutes"] for d,v in zip(direct,approaches))+10:continue
        onboard=totals(legs[1:])
        total=fare(onboard["distanceKm"],onboard["minutes"])
        if total>=sum(fares):continue
        coords=list(legs[0]["coordinates"])
        for item in legs[1:]:coords.extend(item["coordinates"][1:])
        candidate=dict(**metrics,order=[("","pickup1","pickup2","drop1","drop2")[i] for i in order[1:]],
            fareINR=total,passengers=passengers,legs=legs,geometry=dict(type="LineString",coordinates=coords if len(coords)>1 else coords*2))
        if best is None or candidate["fuelLitres"]<best["fuelLitres"]:best=candidate
    if not best:return dict(feasible=False,reason="No beneficial itinerary within limits")
    for k in ("distanceKm","fuelLitres"):
        best[k+"ReductionPercent"]=100*(1-best[k]/separate[k]) if separate[k] else 0
    return dict(feasible=True,source="OPENSTREETMAP",separate=separate,pooled=best,
                objective="Minimum estimated fuel over feasible drop orders; first pickup confirmed")
