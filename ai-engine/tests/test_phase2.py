import sys
import unittest
from collections import Counter
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"phase2"))
from dispatch import allocation, pool, roads, zones


class Decisions(unittest.TestCase):
    def setUp(self):
        self.g = roads.load(roads.FIXTURE)
        self.a,self.c,self.d = [self.g.nodes[n]["point"] for n in "ACD"]
        self.requests = [dict(pickup=p,dropoff=self.d,seats=1) for p in [self.a,self.c]]

    def test_supply_conservation(self):
        result = zones("2026-11-13 09:00",{"Z08":20})
        rows = {r["zone"]:r for r in result["zones"]}
        self.assertEqual(len(rows),8)
        sent,received = Counter(),Counter()
        for move in result["reposition"]:
            sent[move["origin"]] += move["drivers"]
            received[move["target"]] += move["drivers"]
        self.assertTrue(sent)
        for z,row in rows.items():
            self.assertLessEqual(sent[z],max(0,-row["deficit"]))
            self.assertLessEqual(received[z],max(0,row["deficit"]))
            self.assertTrue(1 <= row["surge"] <= 1.6)

    def test_allocation(self):
        drivers = [dict(id=i,point=p,available=True,idleMinutes=t,completedTrips=w)
                   for i,p,t,w in [("A",self.a,60,0),("C",self.c,0,5)]]
        result = allocation(self.g,self.d,drivers)
        self.assertEqual(result["selected"]["driver"],"A")
        self.assertEqual(result["nearest"]["driver"],"C")
        drivers[0]["available"] = False
        self.assertIsNone(allocation(self.g,self.a,drivers)["selected"])

    def test_pool_fares_and_seats(self):
        result = pool(self.g,self.requests,capacity=2)
        self.assertTrue(result["feasible"])
        ride = result["pooled"]
        self.assertAlmostEqual(sum(p["pooledFareINR"] for p in ride["passengers"]),ride["fareINR"])
        self.assertLess(ride["minutes"],result["separate"]["minutes"])
        self.assertFalse(pool(self.g,self.requests,capacity=1)["feasible"])

    def test_detour(self):
        self.requests[1]["pickup"] = self.g.nodes["B"]["point"]
        self.assertFalse(pool(self.g,self.requests,max_detour=.25)["feasible"])
        self.assertTrue(pool(self.g,self.requests,max_detour=3)["feasible"])
