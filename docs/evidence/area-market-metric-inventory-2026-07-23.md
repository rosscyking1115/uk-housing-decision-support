# Area-market metric contract: implementation evidence

**Status:** Uncommitted Housing AE polish candidate, 23 July 2026. ADR-001 is
binding for this work: retain separate owners and do not create a universal
area/region mart.

**Scope boundary:** This note records the implementation and its verification.
It does not add a source, alter scoring, introduce a snapshot/SCD2 table,
deploy, or make a new public product claim. Ross authorised the narrowly scoped
decision-extract reference-year refresh recorded below.

## Declared owners

| Public market metric | Owner and key | Period | Population, denominator and null treatment | Consumer rule |
| --- | --- | --- | --- | --- |
| Area sale context | `rpt_area_profile_mvp`, one row per MSOA `area_id` | Latest configured Land Registry transfer year (`landreg_end_year`; fixture currently 2025) | Matched transactions for the MSOA and year. `median_sale_price_gbp` is a median, so has no ratio denominator. Zero sales gives null price and `none`; 1–4 gives `indicative`; 5+ gives `reliable`. `sales_count_latest_year` and `sale_price_reference_year` travel with the value. | API and website may use this MSOA owner only. It is area context, not a property valuation. |
| Regional sale-price change | `rpt_price_yoy_by_region`, one row per `(region, transferred_year)` | Calendar `transferred_year` | Non-`Unknown` regional transactions. `median_yoy_pct` denominator is the same-region, immediately preceding calendar year median. Earliest or non-contiguous prior year gives null; retain `sales_count`. No regional low-sample threshold has been declared. | Reporting/analysis only. It is not exported, served by the API, or displayed by the website. |
| Regional new-build premium | `rpt_new_build_premium`, one row per `(region, transferred_year)` | Calendar `transferred_year` | Non-`Unknown` regional transactions, split by build type. `premium_pct` denominator is same-region/year `existing_median_price_gbp`; missing side or zero denominator gives null. Retain both counts. No regional low-sample threshold has been declared. | Reporting/analysis only. It is not exported, served by the API, or displayed by the website. |

## Source-to-consumer lineage

| Source/step | Verified artefact | Delivery outcome |
| --- | --- | --- |
| HM Land Registry transactions + postcode geography | `fct_transactions` → `int_area__market` → `rpt_area_profile_mvp` | MSOA sale-context fields are exported by `scripts/build_decision_db.py`, read by `api/data.py`, and rendered by the web API client. |
| HM Land Registry transactions | `rpt_price_yoy_by_region` | Separate regional-year analytical report; no API/web/extract consumer. |
| HM Land Registry transactions | `rpt_new_build_premium` | Separate regional-year analytical report; no API/web/extract consumer. |
| ONSPD-style geography snapshot | `stg_geo__postcodes` → `dim_area` | Current-state geography only, with observation/source-version metadata. |

`models/_exposures.yml` declares the API, website and DuckDB extract against the
two decision marts (`rpt_neighbourhood_score` and `rpt_area_profile_mvp`). This
is the generated-lineage boundary: the regional-year reports are deliberately
not exposed as delivery dependencies. The generated
`C:\tmp\housing-h34-dbt\target\manifest.json` records all three exposures with
exactly these two dependencies; the isolated `catalog.json` was generated from
the same build.

## Reconciliation and contract transport

`tests/assert_area_profile_market_reconciles.sql` reconciles the area-profile
sale median and matched-sale count to the area-market owner.
`tests/assert_market_confidence_policy.sql` fixes the zero/indicative/reliable
policy; `tests/assert_market_metric_periods_declared.sql` requires the declared
periods; the regional tests cover YoY arithmetic and the new-build denominator
guard.

`tests/test_api_market_contract.py` uses an isolated temporary source and
extract. It copies the committed extract into a temporary source fixture,
declares the temporary model period, invokes
`build_decision_db.build(source_db=..., target_db=...)`, checks the exported
column contract, then calls the FastAPI route against that temporary extract.
The golden cases therefore prove API fields are read from the export/model
contract without writing `data/decision.duckdb`.

The committed `data/decision.duckdb` now contains
`sale_price_reference_year = 2025` for all 7,264 area-profile rows. Before the
write, the full-geography model output reconciled exactly to the committed sale
median, matched-sale count and confidence state; the period was its only added
column. The extract was snapshotted at
`D:\_pmo_vault\snapshots\2026-07-23_182141_housing-h34-authorised-reference-year-refresh.zip`
then migrated additively, preserving the existing score table and all other
area-context fields.

## SCD2 decision

**Rejected.** `scripts/load_geography.py` drops and recreates
`raw_geo.onspd_postcodes`; the staged/dimensional geography retains snapshot
metadata but not a retained source-release sequence, valid-time ranges, or
source-backed change events. The repository therefore has no genuine
geography-history semantics on which to base SCD2. Preserve current-state
geography with observation/source-version metadata.

## Isolated verification record

All dbt commands use `C:\tmp\housing-h34-dbt\profiles.yml`, a temporary
DuckDB path, and `--target-path C:\tmp\housing-h34-dbt\target`. They never
point at `data/*.duckdb`.

| Command | Result |
| --- | --- |
| `.\.venv\Scripts\python.exe -m unittest discover -s tests -p "test_*.py"` | PASS — 46 tests in 21.167s. The temporary export test built two 7,264-row tables (14,528 rows total) and exercised three contract tests. The downloader control-flow test used `TemporaryDirectory` and a mocked connection failure; no source data was downloaded. |
| `npm run lint` (from `web`) | PASS — ESLint exit 0. |
| `npm test` (from `web`) | PASS — 2 files, 20 tests. Includes no-sales, indicative, reliable and absent-reference-year sale-price evidence cases. |
| `API_BASE_URL=http://127.0.0.1:8011 npm run build` (from `web`) | PASS — rerun after scope review; Next.js production build compiled, type-checked and generated 24 static pages against a temporary local FastAPI process. Next.js emitted its existing over-2MB cache warnings for `/v2/areas/index`; the build still exited 0. |
| `.\.venv\Scripts\sqlfluff.exe lint models --config C:\tmp\housing-h34-dbt\.sqlfluff` | PASS — dbt templater compiled the project; no lint findings. The temporary configuration points SQLFluff to the isolated profile. |
| `.\.venv\Scripts\dbt.exe build --project-dir . --profiles-dir C:\tmp\housing-h34-dbt --target isolated --target-path C:\tmp\housing-h34-dbt\target --threads 1` | PASS — 264 pass, 0 errors, 0 warnings, 3 declared exposure no-ops (267 total); 23 models, 228 data tests, 16 seeds and 2 unit tests. The temporary warehouse is a local clone of the pre-existing warehouse because an empty isolated file has no `raw_landreg.transactions`; no source download occurred. |
| `.\.venv\Scripts\dbt.exe docs generate --project-dir . --profiles-dir C:\tmp\housing-h34-dbt --target isolated --target-path C:\tmp\housing-h34-dbt\target --threads 1` | PASS — `catalog.json` written to `C:\tmp\housing-h34-dbt\target\catalog.json`. |
| Full-geography temporary decision-mart build with `--vars "{geo_source: onspd}"` | Area-profile owner and its tests passed with 7,264 rows and reference year 2025. The combined run stopped on the unrelated existing score guard `assert_unsupported_jurisdictions_are_not_scored` (407 rows), so no score-table output from that run was exported. |
| Authorised committed-extract migration | PASS — after snapshot, added only `app.rpt_area_profile_mvp.sale_price_reference_year`; 7,264 rows, min/max 2025, 0 null. |
| Real committed-extract API golden parity | PASS — `E02006959` returned £267,295 / 417 / 2025 / `reliable`; `E02003353` returned £528,000 / 291 / 2025 / `reliable`. |
| `.\.venv\Scripts\python.exe -m unittest tests.test_api tests.test_api_market_contract` | PASS — 17 tests. |
| `git diff --check` | PASS — exit 0, no whitespace errors. Git emitted existing LF-to-CRLF working-copy warnings only. |

## Reviewer/QA handoff

Review the three owner/grain assertions, the temporary export-to-API proof,
the deliberate absence of the regional reports from delivery exposures, and the
SCD2 rejection against the replace-loader behaviour. Confirm the final command
outputs recorded above and that the hash of `data/decision.duckdb` is unchanged.
The targeted web tests cover the sale-price evidence state formatter only;
public website wording was intentionally left unchanged.

Open item: the full-geography combined decision build exposes an unrelated
unsupported-jurisdiction scoring failure. It was not folded into this
area-market-only extract migration and requires a separately scoped diagnosis.

**Independent Reviewer/QA outcome:** **PASS.** The reviewer confirmed that no
rendered sale-price evidence copy remains in the website, ADR-001 reflects the
API/export transport contract while leaving presentation separately gated, and
the pre-refresh extract matched `HEAD`. The post-authorisation migration is
covered by the committed-extract API golden parity and API suite above. No
regional report consumer was found in the API, website, extract, or exposures.
