"""Ingestion assets for the five reference sources.

Each wraps an existing loader script (scripts/load_*.py) that reads a prepared
file from data/raw/ and (re)builds one raw_* table in the warehouse. The
prepared files themselves are modelled as *external* assets: they are produced
by the scripts/prepare_*.py normalizers from large/licensed source archives
(police bulk zip, EPC bulk zip, ONSPD zip, OSM extract, planning CSVs) that are
fetched manually and never committed — Dagster documents that boundary in the
lineage instead of pretending to own it.

One deliberate divergence from the scripts: when the prepared file is missing,
the load scripts no-op with exit 0 (so plain-dbt CI and fresh clones are
unaffected). Inside the orchestration graph that would be a silent lie — the
asset would "materialize" without loading anything — so here a missing prepared
file fails the asset with pointers to the prepare script.
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import duckdb
from dagster import (
    AssetExecutionContext,
    AssetKey,
    AssetSpec,
    AssetsDefinition,
    MaterializeResult,
    asset,
)

from .resources import DATA_DIR, WAREHOUSE_DB, load_script


@dataclass(frozen=True)
class ReferenceSource:
    """One reference source: its prepared file, loader script, and warehouse table."""

    asset_name: str  # matches translator.SOURCE_TO_INGEST_ASSET values
    loader_module: str  # module name under scripts/
    prepared_file: str  # under data/raw/
    prepare_script: str  # the normalizer that produces the prepared file
    schema: str
    table: str
    archive_hint: str  # what the prepare script needs, for the error message


REFERENCE_SOURCES = [
    ReferenceSource(
        asset_name="warehouse_geography",
        loader_module="load_geography",
        prepared_file="ref_onspd_normalized.csv",
        prepare_script="prepare_onspd_seed.py",
        schema="raw_geo",
        table="onspd_postcodes",
        archive_hint="an ONSPD snapshot zip from geoportal.statistics.gov.uk",
    ),
    ReferenceSource(
        asset_name="warehouse_crime",
        loader_module="load_crime",
        prepared_file="ref_crime_normalized.csv",
        prepare_script="prepare_crime_seed.py",
        schema="raw_police",
        table="street_crime",
        archive_hint="a police bulk archive from data.police.uk/data",
    ),
    ReferenceSource(
        asset_name="warehouse_epc",
        loader_module="load_epc",
        prepared_file="ref_epc_normalized.csv",
        prepare_script="prepare_epc_seed.py",
        schema="raw_epc",
        table="certificates",
        archive_hint="an EPC bulk zip (GOV.UK One Login required)",
    ),
    ReferenceSource(
        asset_name="warehouse_amenities",
        loader_module="load_amenities",
        prepared_file="ref_amenity_access.csv",
        prepare_script="prepare_amenity_access.py",
        schema="raw_amenities",
        table="area_access",
        archive_hint="a Geofabrik OSM extract (great-britain-latest.osm.pbf)",
    ),
    ReferenceSource(
        asset_name="warehouse_constraints",
        loader_module="load_constraints",
        prepared_file="ref_area_constraints.csv",
        prepare_script="prepare_area_constraints.py",
        schema="raw_constraints",
        table="area_constraints",
        archive_hint="planning.data.gov.uk constraint CSVs",
    ),
]


def _prepared_file_spec(src: ReferenceSource) -> AssetSpec:
    """External asset for the prepared file — produced outside Dagster."""
    return AssetSpec(
        key=AssetKey([f"prepared_{src.asset_name.removeprefix('warehouse_')}"]),
        group_name="ingest",
        description=(
            f"`data/raw/{src.prepared_file}` — normalized by "
            f"`scripts/{src.prepare_script}` from {src.archive_hint}. "
            "Produced manually (the source archive is large/licensed), so this "
            "is an external asset: Dagster tracks it but does not build it."
        ),
        metadata={
            "prepared_by": f"scripts/{src.prepare_script}",
            "path": f"data/raw/{src.prepared_file}",
        },
    )


def _build_load_asset(src: ReferenceSource, upstream: AssetSpec) -> AssetsDefinition:
    @asset(
        name=src.asset_name,
        group_name="ingest",
        compute_kind="duckdb",
        deps=[upstream.key],
        description=(
            f"`data/raw/{src.prepared_file}` loaded into "
            f"{src.schema}.{src.table} by scripts/{src.loader_module}.py — the "
            f"dbt source read when building with the real-source vars."
        ),
    )
    def _load(context: AssetExecutionContext) -> MaterializeResult:
        prepared = DATA_DIR / "raw" / src.prepared_file
        if not prepared.exists():
            raise FileNotFoundError(
                f"{prepared} is missing. Produce it with "
                f"scripts/{src.prepare_script} (needs {src.archive_hint}). "
                "The load script would no-op here; the orchestrated asset "
                "fails instead so a skipped source is visible."
            )

        loader = load_script(src.loader_module)
        return_code = loader.main()
        if return_code != 0:
            raise RuntimeError(
                f"{src.loader_module}.py exited {return_code} — see logs above."
            )

        con = duckdb.connect(str(WAREHOUSE_DB), read_only=True)
        try:
            row_count = con.execute(
                f"select count(*) from {src.schema}.{src.table}"
            ).fetchone()[0]
        finally:
            con.close()

        context.log.info(f"{src.schema}.{src.table} now holds {row_count:,} rows")
        return MaterializeResult(
            metadata={
                "row_count": row_count,
                "table": f"{src.schema}.{src.table}",
                "prepared_file_mb": round(prepared.stat().st_size / 1024 / 1024, 1),
            }
        )

    return _load


prepared_file_specs = [_prepared_file_spec(src) for src in REFERENCE_SOURCES]
reference_load_assets = [
    _build_load_asset(src, spec)
    for src, spec in zip(REFERENCE_SOURCES, prepared_file_specs)
]
