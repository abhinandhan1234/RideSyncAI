"""JSON-lines adapter to the versioned PS2 modules (no training or DB writes)."""
import csv
import json
import sys
from pathlib import Path
import pandas as pd

root = Path(__file__).resolve().parents[4] / "ai-engine"
for folder in ("phase1","phase2","phase3"):
    sys.path.insert(0,str(root/folder))
import demand
import dispatch
import replay
import roads

travel = replay.Travel()


def process(p):
    op = p["op"]
    if op in ("forecast","zones"):
        hour = pd.Timestamp(p["hour"]).tz_convert("Asia/Kolkata")
        return (dispatch.zones(hour.isoformat(),p["supply"]) if op=="zones" else
                demand.forecast(demand.OUT,hour)[:8*p["hours"]])
    if op=="history":
        with (demand.OUT/"holdout.csv").open() as f:
            return [r for r in csv.DictReader(f) if r["zone_id"]==p["zone"]]
    if op=="rank":
        options=p["options"]
        for o in options:
            distance,km,eta,source=travel.leg(tuple(o.pop("point")),tuple(p["pickup"]))
            o.update(distance=distance,km=km,eta=eta,source=source)
        result=[]
        while options:
            best=replay.choose(options,p["policy"],p["penalty"])
            result.append(best)
            options.remove(best)
        return result
    if op=="pool":
        if any(travel.node(tuple(r[k])) is None for r in p["requests"] for k in ("pickup","dropoff")):
            return {"feasible":False,"reason":"Outside graph coverage"}
        return dispatch.pool(travel.graph,p["requests"],p["capacity"],p["detour"])
    a,b=tuple(p["origin"]),tuple(p["destination"])
    vehicle=p["vehicle"]
    if vehicle not in roads.FUEL:
        raise ValueError("Unknown vehicle")
    _,km,eta,source=travel.leg(a,b)
    result={}
    for mode in ("shortest","fastest","eco"):
        if source=="road":
            row=roads.route(travel.graph,a,b,mode,vehicle)
        else:
            economy,allowance=roads.FUEL[vehicle]
            fuel=km/economy+eta/60*allowance
            row=dict(source="ESTIMATE_ONLY",geometry=None,distanceKm=km,etaMinutes=eta,
                     estimatedFuelLitres=fuel,estimatedFuelCostINR=100*fuel)
        result[mode]=dict(**row,type=mode,durationMin=row["etaMinutes"],estimatedFuelL=row["estimatedFuelLitres"],
                          waypoints=row["geometry"]["coordinates"] if row["geometry"] else [])
    return result


for line in sys.stdin:
    try:
        print(json.dumps({"value":process(json.loads(line))},allow_nan=False),flush=True)
    except Exception as error:
        print(json.dumps({"error":str(error)}),flush=True)
