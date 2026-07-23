-- YoY must use an adjacent calendar year and the documented median/mean
-- denominator, rounded to one decimal place.

select
    region,
    transferred_year,
    prior_transferred_year,
    median_yoy_pct,
    mean_yoy_pct
from {{ ref('rpt_price_yoy_by_region') }}
where
    (
        prior_transferred_year is distinct from transferred_year - 1
        and (median_yoy_pct is not null or mean_yoy_pct is not null)
    )
    or (
        prior_transferred_year = transferred_year - 1
        and (
            median_yoy_pct is distinct from round(
                100.0
                * (median_price_gbp - prior_year_median_price_gbp)
                / nullif(prior_year_median_price_gbp, 0),
                1
            )
            or mean_yoy_pct is distinct from round(
                100.0
                * (mean_price_gbp - prior_year_mean_price_gbp)
                / nullif(prior_year_mean_price_gbp, 0),
                1
            )
        )
    )
