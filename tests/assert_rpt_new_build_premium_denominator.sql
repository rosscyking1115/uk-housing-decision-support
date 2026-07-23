-- premium_pct is based on the existing-property median. It must be null where
-- either median is absent or the existing denominator is zero.

select
    region,
    transferred_year,
    new_build_median_price_gbp,
    existing_median_price_gbp,
    premium_pct
from {{ ref('rpt_new_build_premium') }}
where
    (
        (
            new_build_median_price_gbp is null
            or existing_median_price_gbp is null
            or existing_median_price_gbp = 0
        )
        and premium_pct is not null
    )
    or (
        new_build_median_price_gbp is not null
        and existing_median_price_gbp is not null
        and existing_median_price_gbp <> 0
        and premium_pct is distinct from round(
            100.0
            * (new_build_median_price_gbp - existing_median_price_gbp)
            / existing_median_price_gbp,
            1
        )
    )
