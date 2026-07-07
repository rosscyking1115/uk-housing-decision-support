"""Ingestion assets for the five reference sources.

Each wraps an existing loader script (scripts/load_*.py) that reads a prepared
file from data/raw/ and (re)builds one raw_* table in the warehouse. The
prepared files themselves are modelled as *external* assets: they are produced
by the scripts/prepare_*.py normalizers from large/licensed source archives
(police bulk zip, EPC bulk zip, ONSPD zip, OSM extract, planning CSVs) that are
fetched manually and never committed — Dagster documents that boundary in the
lineage instead of pretending to own it.

Every load asset carries a `prepared_file_is_sane` check that validates the
prepared CSV **before** the loader runs. This matters because the loaders are
drop-and-recreate: a truncated or malformed prepared file would replace a good
warehouse table with garbage. The gate (row-count floor, required columns, key
column non-null) aborts the load before the destructive drop.

One deliberate divergence from the scripts: when the prepared file is missing,
the load scripts no-op with exit 0 (so plain-dbt CI and fresh clones are
unaffected). Inside the orchestration graph that would be a silent lie — the
asset would "materialize" without loading anything — so here a missing prepared
file fails the asset with pointers to the prepare script.
"""

from dataclasses import dataclass

import duckdb
from dagster import (
    AssetCheckResult,
    AssetCheckSpec,
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
    key_column: str  # must be non-null in every prepared row
    min_rows: int  # row-count floor — far below this means a truncated file
    required_columns: tuple  # the columns the staging contract reads


REFERENCE_SOURCES = [
    ReferenceSource(
        asset_name="warehouse_geography",
        loader_module="load_geography",
        prepared_file="ref_onspd_normalized.csv",
        prepare_script="prepare_onspd_seed.py",
        schema="raw_geo",
        table="onspd_postcodes",
        archive_hint="an ONSPD snapshot zip from geoportal.statistics.gov.uk",
        key_column="postcode",
        min_rows=2_000_000,  # full ONSPD ≈ 2.7M postcodes
        required_columns=(
            "postcode", "postcode_outward", "postcode_area", "area_id",
            "area_name", "lsoa_code", "local_authority_code",
            "local_authority_name", "region", "latitude", "longitude",
            "is_current_postcode", "source_snapshot_date", "source_name",
            "source_url",
        ),
    ),
    ReferenceSource(
        asset_name="warehouse_crime",
        loader_module="load_crime",
        prepared_file="ref_crime_normalized.csv",
        prepare_script="prepare_crime_seed.py",
        schema="raw_police",
        table="street_crime",
        archive_hint="a police bulk archive from data.police.uk/data",
        key_column="lsoa_code",
        min_rows=10_000_000,  # a year of E&W street crime ≈ 17M rows
        required_columns=("lsoa_code", "crime_type", "month"),
    ),
    ReferenceSource(
        asset_name="warehouse_epc",
        loader_module="load_epc",
        prepared_file="ref_epc_normalized.csv",
        prepare_script="prepare_epc_seed.py",
        schema="raw_epc",
        table="certificates",
        archive_hint="an EPC bulk zip (GOV.UK One Login required)",
        key_column="postcode",
        min_rows=15_000_000,  # E&W domestic certificates ≈ 23.5M
        required_columns=(
            "postcode", "current_energy_rating", "current_energy_efficiency",
            "property_type", "lodgement_date",
        ),
    ),
    ReferenceSource(
        asset_name="warehouse_amenities",
        loader_module="load_amenities",
        prepared_file="ref_amenity_access.csv",
        prepare_script="prepare_amenity_access.py",
        schema="raw_amenities",
        table="area_access",
        archive_hint="a Geofabrik OSM extract (great-britain-latest.osm.pbf)",
        key_column="area_id",
        min_rows=7_000,  # one row per E&W MSOA (7,264)
        required_columns=(
            "area_id", "nearest_station_km", "nearest_supermarket_km",
            "nearest_gp_km", "nearest_school_km", "nearest_greenspace_km",
            "walkable_amenity_count",
        ),
    ),
    ReferenceSource(
        asset_name="warehouse_constraints",
        loader_module="load_constraints",
        prepared_file="ref_area_constraints.csv",
        prepare_script="prepare_area_constraints.py",
        schema="raw_constraints",
        table="area_constraints",
        archive_hint="planning.data.gov.uk constraint CSVs",
        key_column="area_id",
        min_rows=7_000,  # one row per MSOA incl. Scottish spillover (8,601)
        required_columns=(
            "area_id", "planning_constraint_count", "flood_postcode_pct",
            "flood_risk_flag",
        ),
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


def _validate_prepared_file(src: ReferenceSource, prepared) -> AssetCheckResult:
    """The pre-load gate: run BEFORE the drop-and-recreate loader."""
    con = duckdb.connect(":memory:")
    try:
        csv = prepared.as_posix()
        columns = {
            row[0]
            for row in con.execute(
                f"describe select * from read_csv_auto('{csv}')"
            ).fetchall()
        }
        missing_columns = sorted(set(src.required_columns) - columns)
        row_count, key_nulls = 0, 0
        if not missing_columns:
            row_count, key_nulls = con.execute(
                f"""
                select count(*),
                       count(*) filter (where "{src.key_column}" is null)
                from read_csv_auto('{csv}')
                """
            ).fetchone()
    finally:
        con.close()

    passed = (
        not missing_columns
        and row_count >= src.min_rows
        and key_nulls == 0
    )
    return AssetCheckResult(
        check_name="prepared_file_is_sane",
        passed=passed,
        metadata={
            "row_count": row_count,
            "min_expected_rows": src.min_rows,
            "missing_columns": missing_columns,
            "key_column": src.key_column,
            "key_nulls": key_nulls,
        },
    )


def _build_load_asset(src: ReferenceSource, upstream: AssetSpec) -> AssetsDefinition:
    @asset(
        name=src.asset_name,
        group_name="ingest",
        compute_kind="duckdb",
        deps=[upstream.key],
        check_specs=[
            AssetCheckSpec(
                name="prepared_file_is_sane",
                asset=AssetKey([src.asset_name]),
                description=(
                    "Row-count floor, required columns, and key non-null on "
                    f"data/raw/{src.prepared_file} — evaluated BEFORE the "
                    "drop-and-recreate load so a bad file cannot replace a "
                    "good table."
                ),
            )
        ],
        description=(
            f"`data/raw/{src.prepared_file}` loaded into "
            f"{src.schema}.{src.table} by scripts/{src.loader_module}.py — the "
            f"dbt source read when building with the real-source vars."
        ),
    )
    def _load(context: AssetExecutionContext):
        prepared = DATA_DIR / "raw" / src.prepared_file
        if not prepared.exists():
            raise FileNotFoundError(
                f"{prepared} is missing. Produce it with "
                f"scripts/{src.prepare_script} (needs {src.archive_hint}). "
                "The load script would no-op here; the orchestrated asset "
                "fails instead so a skipped source is visible."
            )

        gate = _validate_prepared_file(src, prepared)
        yield gate
        if not gate.passed:
            raise RuntimeError(
                f"prepared_file_is_sane failed for {prepared.name} "
                f"({gate.metadata}) — load aborted before the destructive "
                f"drop of {src.schema}.{src.table}."
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
        yield MaterializeResult(
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
