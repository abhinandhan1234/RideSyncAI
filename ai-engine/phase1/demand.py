"""Canonical simulated demand. All hours use Asia/Kolkata local time."""
import argparse
import hashlib
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OrdinalEncoder

ROOT = Path(__file__).resolve().parent
CSV = ROOT.parent / "data/raw/historical_demand_simulated.csv"
OUT = ROOT / "canonical-v1"
ZONES = [f"Z{i:02}" for i in range(1, 9)]
FEATURES = ["zone_id", "hour", "weekday"]


def history(csv):
    df = pd.read_csv(csv)
    df = df[df.zone_id.isin(ZONES)].copy()
    if df.isna().any().any() or not df.hour.isin(range(24)).all():
        raise ValueError("Missing data or invalid hour")
    df["time"] = pd.to_datetime(df.date, format="%Y-%m-%d", errors="raise") + pd.to_timedelta(df.hour, unit="h")
    df["weekday"] = df.time.dt.weekday
    df = df.sort_values(["time", "zone_id"])
    grid = pd.MultiIndex.from_product([pd.date_range(df.time.min(), periods=672, freq="h"), ZONES])
    if not pd.MultiIndex.from_frame(df[["time","zone_id"]]).equals(grid):
        raise ValueError("Expected 672 consecutive hours for every canonical zone")
    if not np.isfinite(df.demand).all() or (df.demand < 0).any():
        raise ValueError("Invalid demand")
    return df


def train(out):
    df = history(CSV)
    split = df.time.max() - pd.Timedelta(days=7)
    past, hold = df[df.time <= split], df[df.time > split].copy()
    model = make_pipeline(ColumnTransformer([("zone", OrdinalEncoder(), ["zone_id"])], remainder="passthrough"),
                          HistGradientBoostingRegressor(max_iter=90, max_leaf_nodes=13, l2_regularization=2,
                                                       random_state=42, early_stopping=False))
    model.fit(past[FEATURES], past.demand)
    hold["prediction"] = model.predict(hold[FEATURES]).clip(0)
    hold["baseline"] = past.groupby(["zone_id","hour"]).demand.mean().reindex(
        pd.MultiIndex.from_frame(hold[["zone_id","hour"]])).to_numpy()
    metrics = {}
    for name in ["prediction","baseline"]:
        error = hold[name] - hold.demand
        metrics[name] = dict(mae=abs(error).mean(), rmse=np.sqrt((error**2).mean()))
    model.fit(df[FEATURES], df.demand)
    out.mkdir(parents=True, exist_ok=False)
    metadata = dict(version="canonical-v1", source="SYNTHETIC", features=FEATURES, timezone="Asia/Kolkata",
                    sha256=hashlib.sha256(CSV.read_bytes()).hexdigest(), sklearn=sklearn.__version__,
                    trainRows=len(past), holdoutRows=len(hold), trainEnd=str(split), fittedThrough=str(df.time.max()), metrics=metrics)
    joblib.dump(model, out/"pipeline.joblib", compress=3)
    hold[["time","zone_id","demand","prediction","baseline"]].to_csv(out/"holdout.csv", index=False)
    (out/"metadata.json").write_text(json.dumps(metadata, indent=2))
    return metadata


def forecast(out, start, zone=None):
    timestamp = pd.Timestamp(start)
    if timestamp.tz is not None:
        timestamp = timestamp.tz_convert("Asia/Kolkata").tz_localize(None)
    meta = json.loads((out/"metadata.json").read_text())
    if pd.isna(timestamp) or timestamp != timestamp.floor("h") or timestamp <= pd.Timestamp(meta["fittedThrough"]):
        raise ValueError("Expected a future local hour after training")
    if zone is not None and zone not in ZONES:
        raise ValueError("Unknown zone")
    rows = [(t,z,t.hour,t.weekday()) for t in pd.date_range(timestamp, periods=1 if zone else 24, freq="h")
            for z in ([zone] if zone else ZONES)]
    frame = pd.DataFrame(rows, columns=["time",*FEATURES])
    values = joblib.load(out/"pipeline.joblib").predict(frame[FEATURES]).clip(0)
    if not np.isfinite(values).all():
        raise ValueError("Nonfinite forecast")
    return [dict(zone=z, hour=t.tz_localize("Asia/Kolkata").isoformat(), demand=round(float(v),3),source="SYNTHETIC")
            for (t,z,*_),v in zip(rows,values)]


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["train","predict"])
    parser.add_argument("--out", type=Path, default=OUT)
    parser.add_argument("--start")
    parser.add_argument("--zone")
    args = parser.parse_args()
    print(json.dumps(train(args.out) if args.action == "train" else forecast(args.out,args.start,args.zone),indent=2))
