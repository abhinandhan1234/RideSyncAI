import sys
import tempfile
import unittest
from pathlib import Path

import networkx as nx
import pandas as pd

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"phase1"))
import demand
import roads


class DemandTests(unittest.TestCase):
    def test_reload(self):
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory)/"version"
            metadata = demand.train(out)
            self.assertEqual(metadata["holdoutRows"],1344)
            self.assertEqual(demand.forecast(out,"2026-11-13 09","Z01"),
                             demand.forecast(demand.OUT,"2026-11-13 09","Z01"))

    def test_horizon(self):
        rows = demand.forecast(demand.OUT,"2026-11-13 09")
        self.assertEqual(len(rows),192)
        self.assertEqual({r["zone"] for r in rows},set(demand.ZONES))
        self.assertEqual(len({(r["zone"],r["hour"]) for r in rows}),192)
        self.assertEqual(rows[-1]["hour"],"2026-11-14T08:00:00+05:30")
        for t,z in [("2026-11-10","Z01"),("2026-12-01","DEMO-Z1"),("2026-12-01 01:30","Z02")]:
            with self.assertRaises(ValueError):
                demand.forecast(demand.OUT,t,z)

    def test_duplicate_and_missing_hour(self):
        frame = pd.read_csv(demand.CSV)
        frame.iloc[1] = frame.iloc[0]
        with tempfile.TemporaryDirectory() as directory:
            csv = Path(directory)/"invalid.csv"
            frame.to_csv(csv,index=False)
            with self.assertRaises(ValueError):
                demand.history(csv)


class RoadTests(unittest.TestCase):
    def setUp(self):
        self.g = roads.load(roads.FIXTURE)
        self.a,self.d = [74.5,15.85],[74.51,15.85]

    def test_optimality(self):
        for u in self.g:
            for v in nx.descendants(self.g,u):
                points = [self.g.nodes[n]["point"] for n in (u,v)]
                self.assertEqual(roads.route(self.g,*points),roads.route(self.g,*points,algorithm="dijkstra"))

    def test_direction_and_disconnect(self):
        for end in [self.a,[74.512,15.855]]:
            with self.assertRaises(nx.NetworkXNoPath):
                roads.route(self.g,self.d,end)

    def test_objectives_and_geometry(self):
        short,fast,eco = [roads.route(self.g,self.a,self.d,m) for m in ("shortest","fastest","eco")]
        self.assertLess(short["distanceKm"],fast["distanceKm"])
        self.assertLess(fast["etaMinutes"],short["etaMinutes"])
        self.assertLess(eco["estimatedFuelLitres"],short["estimatedFuelLitres"])
        self.assertEqual(eco["geometry"],dict(type="LineString",coordinates=[tuple(self.a),(74.505,15.854),tuple(self.d)]))
        for vehicle,(economy,allowance) in roads.FUEL.items():
            result = roads.route(self.g,self.a,self.d,"eco",vehicle)
            litres = result["distanceKm"]/economy + result["etaMinutes"]/60*allowance
            self.assertAlmostEqual(result["estimatedFuelCostINR"],round(litres*100,2))

    def test_invalid(self):
        for origin,vehicle in [([200,0],"cab"),([0,0],"cab"),(self.a,"bus")]:
            with self.assertRaises(ValueError):
                roads.route(self.g,origin,self.d,vehicle=vehicle)
