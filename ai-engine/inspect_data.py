"""
inspect_data.py — RideSync AI: CSV data inspector utility.

Run this script to scan candidate data directories for CSV files and
print a detailed diagnostic summary of each file found.

Usage:
    python inspect_data.py
"""

import os
import sys
from pathlib import Path

try:
    import pandas as pd
    import numpy as np
except ImportError:
    print("Missing dependency: install requirements.txt")
    print("  python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Candidate directories to search for CSV files (relative to this script)
# ---------------------------------------------------------------------------
_SCRIPT_DIR = Path(__file__).resolve().parent

DATA_PATHS = [
    "data/raw/",
    "data/processed/",
    "../data/synthetic/",
    "../data/samples/",
    "../../",
    "../../ridesync-belagavi-starter/sample_data/",
    "./data/",
]


def _resolve_paths(paths):
    """Return (path_obj, label) tuples for each candidate directory that exists."""
    resolved = []
    for p in paths:
        full = (_SCRIPT_DIR / p).resolve()
        if full.is_dir():
            resolved.append((full, str(p)))
    return resolved


def _find_csvs(dirs):
    """Return list of Path objects for every .csv file found under dirs."""
    csvs = []
    for directory, _ in dirs:
        csvs.extend(sorted(directory.glob("*.csv")))
    return csvs


def _has_date_column(df):
    """Return list of column names that look like date/timestamp columns."""
    return [c for c in df.columns if "date" in c.lower() or "time" in c.lower()]


def _inspect_csv(csv_path: Path):
    """Load and print a diagnostic summary for a single CSV file."""
    print("=" * 70)
    print(f"FILE : {csv_path.name}")
    print(f"PATH : {csv_path}")
    print("-" * 70)

    try:
        df = pd.read_csv(csv_path)
    except Exception as exc:
        print(f"  ERROR loading file: {exc}")
        return

    rows, cols = df.shape
    print(f"SHAPE: {rows} rows × {cols} columns\n")

    # Column names and dtypes
    print("COLUMNS & DTYPES:")
    for col, dtype in df.dtypes.items():
        print(f"  {col:<35} {str(dtype)}")

    # Missing values
    print("\nMISSING VALUES:")
    missing = df.isnull().sum()
    has_missing = False
    for col, count in missing.items():
        if count > 0:
            pct = 100 * count / rows if rows > 0 else 0
            print(f"  {col:<35} {count} ({pct:.1f}%)")
            has_missing = True
    if not has_missing:
        print("  (none)")

    # Duplicate rows
    dup_count = df.duplicated().sum()
    print(f"\nDUPLICATE ROWS: {dup_count}")

    # Date range (if applicable)
    date_cols = _has_date_column(df)
    if date_cols:
        print("\nDATE / TIMESTAMP RANGE:")
        for col in date_cols:
            try:
                parsed = pd.to_datetime(df[col], infer_datetime_format=True, errors="coerce")
                valid = parsed.dropna()
                if not valid.empty:
                    print(f"  {col:<35} {valid.min()} → {valid.max()}")
                else:
                    print(f"  {col:<35} (could not parse as dates)")
            except Exception as exc:
                print(f"  {col:<35} (parse error: {exc})")

    # Basic numeric stats
    numeric_df = df.select_dtypes(include=[np.number])
    if not numeric_df.empty:
        print("\nNUMERIC STATISTICS (df.describe()):")
        try:
            stats = numeric_df.describe()
            print(stats.to_string())
        except Exception as exc:
            print(f"  (could not compute stats: {exc})")
    else:
        print("\nNUMERIC STATISTICS: (no numeric columns)")

    print()


def _print_help():
    """Print a help message when no CSV files are found."""
    print("=" * 70)
    print("NO CSV FILES FOUND")
    print("=" * 70)
    print(
        "\nPlace your historical demand CSV in one of:\n"
        "  • ai-engine/data/raw/           ← primary local location\n"
        "  • data/synthetic/               ← synthetic / generated data\n"
        "  • data/samples/                 ← small samples for testing\n"
        "  • ridesync-belagavi-starter/sample_data/  ← reference starter data\n"
        "\nExpected columns (flexible — not all required):\n"
        "  date / timestamp    — observation timestamp\n"
        "  zone_id / zone_code — zone identifier\n"
        "  hour                — hour of day (0–23)\n"
        "  day_of_week         — 0=Monday … 6=Sunday\n"
        "  request_count       — number of ride requests\n"
        "  available_drivers   — number of online drivers\n"
        "\nExtra columns are fine; the AI engine will select relevant features.\n"
    )


def main():
    print("\nRideSync AI — Data Inspector")
    print("Scanning candidate directories …\n")

    dirs = _resolve_paths(DATA_PATHS)
    if not dirs:
        print("WARNING: None of the candidate directories exist yet.")
        print("Searched:")
        for p in DATA_PATHS:
            print(f"  {(_SCRIPT_DIR / p).resolve()}")
        print()

    csvs = _find_csvs(dirs)

    if not csvs:
        _print_help()
        return

    print(f"Found {len(csvs)} CSV file(s).\n")
    for csv_path in csvs:
        try:
            _inspect_csv(csv_path)
        except Exception as exc:
            print(f"  Unexpected error inspecting {csv_path.name}: {exc}\n")

    print("=" * 70)
    print("Inspection complete.")


if __name__ == "__main__":
    main()
