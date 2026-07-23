# ADR-001: Area-market metric contract

- **Status:** Accepted — independent Reviewer/QA PASS, 2026-07-23
- **Date:** 2026-07-23
- **Scope:** Contract decision for H-ADR and its authorised model-contract follow-on. It does not authorise scoring, source, deployment, extract-refresh, or public-copy changes.

## Context

The product uses three legitimate but different market grains. An MSOA area profile supports an area-shortlisting decision, while the two regional reports support time-series analysis. Calling any one of these a universal market mart would either duplicate a regional metric across unrelated MSOAs or falsely imply that it has area-level precision.

The existing public delivery path is deliberately narrower than the warehouse: the decision extract exports `rpt_area_profile_mvp` and `rpt_neighbourhood_score`; FastAPI reads those two tables; the Next.js website is an HTTP client of that API. The two regional reports have tests and `scripts/check_marts.py` as current consumers, but no declared dbt exposure, extract, API endpoint, or website consumer.

## Decision

Keep one owner per published measure, but keep each owner at its natural grain. A conformed interface means documented keys, period, denominator, null semantics, and permitted consumers; it does **not** mean one physical universal mart.

| Metric family | dbt owner | Business key and grain | Permitted current consumer |
| --- | --- | --- | --- |
| Latest area sale context | `rpt_area_profile_mvp` (derived from `int_area__market`) | `area_id`; one MSOA area row | Decision extract, API, and website area experiences |
| Regional sale-price change | `rpt_price_yoy_by_region` | `(region, transferred_year)` | Warehouse analysis and `scripts/check_marts.py` only |
| Regional new-build premium | `rpt_new_build_premium` | `(region, transferred_year)` | Warehouse analysis and `scripts/check_marts.py` only |

The product/exposure owner remains Cheng-Yuan King, as declared in `models/_exposures.yml`. The dbt owner named above is the sole definition authority for its measure; downstream code may transport or format it but must not recompute it.

## Metric contracts

### 1. Latest MSOA sale context

- **Measure and period:** `median_sale_price_gbp` is the median of matching `fct_transactions.price_gbp` where `transferred_year = var('landreg_end_year')`. The current project configuration sets that year to **2025**. `sales_count_latest_year` is the count over that same eligible population and period.
- **Grain and joins:** one row per MSOA `area_id`, built from the `dim_area` spine. The transaction-to-area association is a normalised postcode equality join through `dim_postcode_geography`; it is not a region-year calculation.
- **Eligible population / denominator:** the eligible sale population is `fct_transactions`: the project's arm's-length residential Land Registry transaction fact after its stated standard-transaction and data-hygiene treatment. The metric denominator is therefore the matched latest-year transaction population, not dwellings, households, listings, or every sale ever recorded.
- **Low-sample and null treatment:** `min_reliable_sale_sample = 5`. Zero matched sales gives `sales_count_latest_year = 0`, `median_sale_price_gbp = NULL`, and confidence `none`. A count of 1–4 preserves the calculated median and labels it `indicative`; a count of 5 or more labels it `reliable`. A null price must never become £0, a zero, or a score.
- **Consumer rule:** any product consumer must transport the price with its confidence label, latest-year sale count, and reference year, and treat it as area context rather than a property valuation. The API/export contract transports all four fields from `rpt_area_profile_mvp`. User-facing presentation remains separately gated; this slice does not change public web wording.

### 2. Regional median price year-on-year change

- **Measure and period:** `median_yoy_pct` is the one-decimal percentage change from the previous region-period median to the current `transferred_year` median. `median_price_gbp`, mean, p10, p90, and `sales_count` are the supporting facts for every `(region, transferred_year)` row in the configured analysis window.
- **Grain and denominator:** region × calendar transfer year. The denominator of the percentage is `prior_year_median_price_gbp` for the same region; it is never an MSOA price, transaction count, or national value. `Unknown` regions are excluded.
- **Null and low-sample treatment:** the earliest available period has null prior-year values and null YoY; those nulls mean “no comparable prior period”, not 0%. No regional low-sample reliability threshold currently exists. Counts must be retained beside any future display and no consumer may invent `reliable`/`indicative` labels from the MSOA threshold.
- **Consumer rule:** until a separately reviewed delivery interface exists, this report is analytical only. A future consumer must retain the contiguous-calendar-year guard before labelling the value “year-on-year”; a missing year leaves the YoY value null.

### 3. Regional new-build premium

- **Measure and period:** `premium_pct` is the one-decimal percentage difference between the new-build and non-new-build median price in the same `(region, transferred_year)`.
- **Grain and denominator:** region × calendar transfer year. The denominator is `existing_median_price_gbp` (the median for `not is_new_build`) in that same region and year. `new_build_count` and `existing_count` are the two supporting sample counts. `Unknown` regions are excluded.
- **Null and low-sample treatment:** `premium_pct` is null if either side has no median or if the existing median is zero; it must not become 0% or “no premium”. No regional sample-size threshold is defined, so the counts are mandatory context and no reliability label is authorised.
- **Consumer rule:** this metric cannot be joined to an MSOA on `region` without duplicating a regional fact across areas. It remains an analysis/reporting metric until a separately approved regional endpoint or view defines its presentation and caveat behaviour.

## Consumer and exposure rules

1. The existing API, website, and DuckDB extract exposures depend only on `rpt_area_profile_mvp` and `rpt_neighbourhood_score`. They must not be represented as consumers of the regional reports.
2. An API or web client may filter/group MSOA rows by `region`, but that does not make a region-level time-series value an MSOA fact.
3. No downstream layer may use a null market value as a numeric default, or use the five-sale MSOA confidence threshold for a regional metric.
4. Any proposed new regional exposure must first name its owner report, grain, period, counts, null display, and intended decision. It must not add the reports to the decision extract merely for lineage symmetry.

## SCD2 decision: rejected

`dim_area` is a current-state geography dimension. The geography contract carries `source_snapshot_date`, source name, and URL, but the real-source loader recreates `raw_geo.onspd_postcodes` from one normalised ONSPD-style file; it does not retain prior source releases. The committed seed is a CI fixture. There is therefore **no real source-backed geography history retained by this repository** from which valid-from/valid-to records or attribute changes can be derived.

Do not create a dbt snapshot or synthetic SCD2 history from repeated builds, file timestamps, or the fixture. That would manufacture history rather than record it.

Reconsider SCD2 only when all of the following evidence exists:

1. retained, authoritative geography releases or a source-provided change history covering the attributes to historise;
2. an attributable observation/effective date for every retained release, plus a documented choice between source-effective and ingestion-effective semantics;
3. a stable business key or an official correspondence/crosswalk policy for boundary/code changes;
4. a change-bearing attribute with a documented business use for “as-of” joins; and
5. a reproducible ingestion path that appends/versions releases rather than replacing the current table.

Until then, retain current-state geography with source-snapshot metadata only.

## Consequences

- The three reports remain separate, explicit contracts; no universal market mart is introduced.
- The analytical reports retain no API, website, extract, or dbt-exposure delivery consumer.
- The API/export contract carries the area-sale period, count, and confidence fields from the MSOA owner. Ross authorised and completed the additive reference-year extract migration on 2026-07-23; any broader extract rebuild remains separately scoped work.

## Evidence consulted

- `models/marts/decision/rpt_area_profile_mvp.sql`
- `models/intermediate/int_area__market.sql`
- `models/marts/analytics/rpt_price_yoy_by_region.sql`
- `models/marts/analytics/rpt_new_build_premium.sql`
- `models/_exposures.yml`, `scripts/build_decision_db.py`, `api/data.py`, `api/models.py`, `api/main.py`, and the web type/presentation files
- `models/marts/core/dim_area.sql`, `models/staging/stg_geo__postcodes.sql`, `models/staging/_sources.yml`, `scripts/load_geography.py`, and `scripts/prepare_onspd_seed.py`
