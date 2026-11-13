import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"phase3"))
from replay import choose, Travel, simulate


class ReplayTests(unittest.TestCase):
    def test_cap_and_workload(self):
        options=[dict(id=str(i),eta=t,assigned=n,idle=20,completed=n,acceptance=.8)
                 for i,(t,n) in enumerate([(1,4),(1.5,2),(4,0)])]
        self.assertEqual(choose(options,"constrained",1)["id"],"1")
        self.assertEqual(choose(options,"constrained",0)["id"],"0")

    def test_coverage_and_busy_state(self):
        travel=Travel()
        self.assertEqual(travel.leg((74.6,15.8),(74.7,15.8))[-1],"estimate")
        driver=dict(driver_id="A",available="True",longitude=74.6,latitude=15.8,vehicle_type="cab",
                    idle_minutes=0,completed_rides=0,acceptance_rate=1)
        req=dict(ride_id="r",vehicle_type="cab",pickup_lon=74.6,pickup_lat=15.8,dropoff_lon=74.61,dropoff_lat=15.8,
                 pickup_time="2026-10-15T01:00")
        later=dict(req,pickup_time="2026-10-15T02:00",pickup_lon=74.61)
        result=simulate([req,req,later],[driver],travel,"constrained",1)
        self.assertEqual((result["completed"],result["unserved"]),(2,1))
        self.assertEqual(result["samples"][-1]["choice"]["eta"],0)
