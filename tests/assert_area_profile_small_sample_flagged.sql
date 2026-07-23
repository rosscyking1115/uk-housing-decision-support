-- Risk: an area median computed from a handful of transactions is an outlier
--       magnet (prime-central areas can show a £13M median from 2 sales). The
--       profile must never present such a median as reliable market context.
--
-- Fail rows: a zero-count area with a price or a non-'none' confidence; an
-- indicative/reliable area with a null price; or a count/confidence mismatch.

select
    area_id,
    sales_count_latest_year,
    median_sale_price_gbp,
    median_sale_price_confidence
from {{ ref('rpt_area_profile_mvp') }}
where
    (
        sales_count_latest_year = 0
        and (
            median_sale_price_gbp is not null
            or median_sale_price_confidence <> 'none'
        )
    )
    or (
        sales_count_latest_year between 1 and {{ var('min_reliable_sale_sample') - 1 }}
        and (
            median_sale_price_gbp is null
            or median_sale_price_confidence <> 'indicative'
        )
    )
    or (
        sales_count_latest_year >= {{ var('min_reliable_sale_sample') }}
        and (
            median_sale_price_gbp is null
            or median_sale_price_confidence <> 'reliable'
        )
    )
