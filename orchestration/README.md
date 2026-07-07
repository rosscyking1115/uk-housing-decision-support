# Orchestration (Dagster)

Models the MoveIn data refresh as a **Dagster asset graph**, turning a sequence
of hand-run scripts + dbt commands into an explicit, lineage-tracked pipeline
with a **data-quality gate at ingestion**.

```
raw_landreg_ppd ──► warehouse_transactions ─┐
   (download)          (load to DuckDB)     │
      └─ gate: raw_landreg_ppd_is_sane      │
                                            ├──► [dbt: staging → int → marts] ──► decision_extract
prepared_geography ──► warehouse_geography ─┤      (29 models, 197 tests,           (slim API extract)
prepared_crime ──────► warehouse_crime ─────┤       built with real-source vars)
prepared_epc ────────► warehouse_epc ───────┤
prepared_amenities ──► warehouse_amenities ─┤
prepared_constraints ► warehouse_constraints┘
```

All **six sources** are wired. The Land Registry spine is fully automated
(download → load). The five reference sources are loaded from prepared files in
`data/raw/`; the prepared files themselves are **external assets** — they come
out of `scripts/prepare_*.py` run against large/licensed archives (police bulk
zip, EPC bulk zip, ONSPD zip, OSM extract, planning CSVs) that are fetched
manually and never committed. Dagster documents that boundary in the lineage
instead of pretending to own it.

## Real sources vs fixture seeds

The staging models switch on dbt vars between the committed fixture seeds
(CI default) and the real `raw_*` warehouse schemas. The orchestrated pipeline
IS the real refresh, so it parses **and** builds with the real-source vars
(`resources.REAL_SOURCE_VARS`): `geo_source: onspd`, `epc_source: bulk`,
`crime_source: bulk`, `constraints_source: computed`, `amenities_source:
computed`. This matters at *parse* time, not just build time — a fixture-vars
manifest would wire staging to the seeds and leave the ingestion assets
disconnected from the graph. Plain `dbt build` (CI) keeps the fixture default.

## Why Dagster (and why not more)

- **Dagster, not Airflow** — the pipeline is a set of data assets with lineage,
  not a task DAG. `dagster-dbt` loads every dbt model as an asset and every dbt
  test as an asset check, so dbt's lineage flows into one graph.
- **DuckDB stays** — the data (4.99M Land Registry rows, 2021–2025) fits on one
  machine. No Snowflake/Spark; that would be cost and ops for no gain.
- **The genuinely new layer is the ingestion gate.** dbt tests run *after* load;
  `raw_landreg_ppd_is_sane` runs on the raw parquet *before* it enters the
  warehouse, catching a truncated file / null flood / malformed-postcode wave at
  the front door. It is a **blocking** check — a failure halts the graph.

## Layout

| File | What it holds |
| --- | --- |
| `definitions.py` | The `Definitions` — assets, the ingestion check, the dbt resource. |
| `resources.py` | Paths, real-source vars, the `DbtProject`/`DbtCliResource`, `load_script()`. |
| `ingest_assets.py` | `raw_landreg_ppd`, `warehouse_transactions` (the automated Land Registry spine). |
| `reference_assets.py` | The five reference sources: external prepared-file specs + `warehouse_*` load assets. |
| `dbt_assets.py` | `@dbt_assets` — the whole dbt project as one asset set, built with real-source vars. |
| `export_assets.py` | `decision_extract` — export the two decision marts to the API extract. |
| `checks.py` | `raw_landreg_ppd_is_sane` — the ingestion gate. |
| `translator.py` | Remaps every dbt source onto its ingestion asset so lineage is continuous. |

## Run it

```bash
# from the repo root, with the project venv active
dagster dev -m orchestration.definitions      # UI at http://127.0.0.1:3000
```

Assets are runnable **on demand** from the UI (Materialize). The local warehouse
is fixture-only and full source files are large/licensed, so this is not cron'd
in production — the graph models the refresh and runs when pointed at real data.

Once `decision_extract` writes `data/decision.duckdb`, committing that file to
`main` triggers the existing deploy half of the refresh
(`.github/workflows/refresh.yml` → Fly + Vercel).

### Config

`raw_landreg_ppd` takes optional run config:

```yaml
ops:
  raw_landreg_ppd:
    config:
      years: [2024, 2025]   # default: the window in dbt_project.yml
      force_refresh: false  # re-download even if the parquet exists
```

## Notes / gotchas

- **profiles.yml** resolves from `~/.dbt` (dbt's default). Override with
  `DBT_PROFILES_DIR` (e.g. in CI).
- **Windows DuckDB write-lock** — the dbt build runs `--threads 1`, and the
  ingest assets must not run concurrently with each other or with a dbt build;
  materialize them sequentially (the write-lock allows one writer per file).
- **Missing prepared file fails the asset** (deliberately). The `load_*.py`
  scripts no-op with exit 0 when their input is absent so plain-dbt CI is
  unaffected; inside the graph that would be a silent lie, so the asset raises
  with a pointer to the right `prepare_*.py`.
- **Scripts are imported by file path** (`resources.load_script`), not via
  `sys.path` — a path side-effect at import time does not survive into
  Dagster's spawned step workers on Windows.
- **protobuf/grpc pins** — see `requirements.txt`; `grpcio-health-checking>=1.82`
  ships a protobuf-7.x gencode that breaks against dbt's `protobuf<7.0` cap.
