"""Ingestion assets: raw Land Registry files → the warehouse table.

These wrap the existing refresh scripts (scripts/download_raw.py and
scripts/load_to_duckdb.py) so their behaviour is unchanged — Dagster just makes
the ordering explicit and records materialization metadata. Both scripts are
idempotent, so re-materializing is safe.
"""

from datetime import timedelta
from typing import Optional

import duckdb
from dagster import (
    AssetExecutionContext,
    Config,
    FreshnessPolicy,
    MaterializeResult,
    MetadataValue,
    asset,
)

from .resources import RAW_GLOB, WAREHOUSE_DB, load_script


class LandRegistryIngestConfig(Config):
    """Run-time knobs for the raw download.

    years: explicit years to (re)download; None uses the configured window in
    dbt_project.yml. force_refresh: re-fetch even if the parquet already exists.
    """

    years: Optional[list[int]] = None
    force_refresh: bool = False


@asset(
    group_name="ingest",
    compute_kind="python",
    description=(
        "HM Land Registry Price Paid CSVs downloaded and converted to "
        "data/raw/pp-*.parquet. Idempotent — existing years are skipped unless "
        "force_refresh is set."
    ),
)
def raw_landreg_ppd(
    context: AssetExecutionContext, config: LandRegistryIngestConfig
) -> MaterializeResult:
    download_raw = load_script("download_raw")

    years = config.years or download_raw.load_default_years()
    context.log.info(f"Ensuring raw PPD parquet for years: {years}")

    paths = [
        download_raw.download_year(year, force_refresh=config.force_refresh)
        for year in years
    ]
    total_mb = sum(p.stat().st_size for p in paths) / 1024 / 1024

    return MaterializeResult(
        metadata={
            "years": years,
            "num_files": len(paths),
            "total_size_mb": round(total_mb, 1),
            "files": MetadataValue.md(
                "\n".join(f"- `{p.name}`" for p in paths)
            ),
        }
    )


@asset(
    group_name="ingest",
    compute_kind="duckdb",
    deps=[raw_landreg_ppd],
    # Mirrors the dbt source-freshness config on landreg.transactions
    # (warn_after 35 days, error_after 90 — Land Registry publishes monthly).
    freshness_policy=FreshnessPolicy.time_window(
        fail_window=timedelta(days=90), warn_window=timedelta(days=35)
    ),
    description=(
        "Every pp-*.parquet loaded into raw_landreg.transactions in "
        "warehouse.duckdb — the dbt source `landreg.transactions` reads this."
    ),
)
def warehouse_transactions(context: AssetExecutionContext) -> MaterializeResult:
    load_to_duckdb = load_script("load_to_duckdb")

    return_code = load_to_duckdb.main()
    if return_code != 0:
        raise RuntimeError(
            f"load_to_duckdb.py exited {return_code} — see logs above."
        )

    con = duckdb.connect(str(WAREHOUSE_DB), read_only=True)
    try:
        row_count = con.execute(
            "select count(*) from raw_landreg.transactions"
        ).fetchone()[0]
        date_min, date_max = con.execute(
            "select min(date_of_transfer), max(date_of_transfer) "
            "from raw_landreg.transactions"
        ).fetchone()
    finally:
        con.close()

    context.log.info(f"raw_landreg.transactions now holds {row_count:,} rows")
    return MaterializeResult(
        metadata={
            "row_count": row_count,
            "date_min": str(date_min),
            "date_max": str(date_max),
        }
    )
