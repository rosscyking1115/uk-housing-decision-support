-- Deterministic edge cases for the macro used by rpt_area_profile_mvp. The
-- no-sales case must leave the price null; sample depths 1..threshold-1 are
-- indicative; the threshold itself is reliable.

with cases as (

    select 0 as sales_count_latest_year, cast(null as bigint) as median_sale_price_gbp, 'none' as expected_confidence
    union all
    select 1 as sales_count_latest_year, 100000 as median_sale_price_gbp, 'indicative' as expected_confidence
    union all
    select {{ var('min_reliable_sale_sample') - 1 }} as sales_count_latest_year, 150000 as median_sale_price_gbp, 'indicative' as expected_confidence
    union all
    select {{ var('min_reliable_sale_sample') }} as sales_count_latest_year, 200000 as median_sale_price_gbp, 'reliable' as expected_confidence

),

calculated as (

    select
        *,
        {{ market_confidence('sales_count_latest_year') }} as actual_confidence
    from cases

)

select *
from calculated
where
    actual_confidence <> expected_confidence
    or (
        sales_count_latest_year = 0
        and median_sale_price_gbp is not null
    )
    or (
        sales_count_latest_year > 0
        and median_sale_price_gbp is null
    )
