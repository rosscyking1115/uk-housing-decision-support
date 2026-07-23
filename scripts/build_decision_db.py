"""Build the slim read-only DuckDB extract the API ships (api/).

Exports the two decision marts — rpt_neighbourhood_score (component + overall
scores, one row per MSOA) and rpt_area_profile_mvp (the raw per-area facts) —
from the full warehouse into data/decision.duckdb. Both are ~7,300 rows, so the
file stays small enough to commit and bake into the API image.

This is the last step of a data refresh. Build the decision marts on real data
first, e.g.:
    dbt run --select rpt_area_profile_mvp rpt_neighbourhood_score \\
        --vars '{geo_source: onspd, epc_source: bulk, crime_source: bulk, \\
                 constraints_source: computed, amenities_source: computed}'

Then:
    python scripts/build_decision_db.py

Committing the refreshed data/decision.duckdb to main triggers the deploy half
of the refresh (.github/workflows/refresh.yml) — see DEPLOY.md § Data refresh.
"""

from __future__ import annotations

import sys
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DB = ROOT / "data" / "warehouse.duckdb"
TARGET_DB = ROOT / "data" / "decision.duckdb"

TABLES_TO_EXPORT = [
    ("main_decision", "rpt_neighbourhood_score"),
    ("main_decision", "rpt_area_profile_mvp"),
]


def build(*, source_db: Path = SOURCE_DB, target_db: Path = TARGET_DB) -> int:
    """Export decision marts to a caller-selected DuckDB file.

    Production uses the module defaults. Tests pass temporary paths so the
    committed API extract is never modified during contract verification.
    """
    if not source_db.exists():
        print(
            f"Source warehouse not found at {source_db}.\n"
            f"Run `dbt run` on the decision marts first.",
            file=sys.stderr,
        )
        return 1

    if target_db.exists():
        target_db.unlink()
        print(f"Removed existing {target_db.name}")

    print(f"Building {target_db.name} from {source_db.name}...")
    target = duckdb.connect(str(target_db))
    target.execute(f"ATTACH '{source_db.as_posix()}' AS source (READ_ONLY)")
    target.execute("CREATE SCHEMA IF NOT EXISTS app")

    total_rows = 0
    for source_schema, table in TABLES_TO_EXPORT:
        target.execute(
            f"CREATE TABLE app.{table} AS "
            f"SELECT * FROM source.{source_schema}.{table}"
        )
        rowcount = target.execute(f"SELECT count(*) FROM app.{table}").fetchone()[0]
        print(f"  app.{table:<28}  {rowcount:>6,} rows")
        total_rows += rowcount

    target.execute("DETACH source")
    target.close()

    size_kb = target_db.stat().st_size / 1024
    print(f"\nDone. {total_rows:,} rows total, {size_kb:.1f} KB on disk.")
    return 0


def main() -> int:
    return build()


if __name__ == "__main__":
    sys.exit(main())
