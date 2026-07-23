-- The public area owner is a presentation of int_area__market, not an
-- independently recomputed market aggregation.

select
    profile.area_id,
    profile.median_sale_price_gbp as profile_median_sale_price_gbp,
    market.median_sale_price_gbp as market_median_sale_price_gbp,
    profile.sales_count_latest_year as profile_sales_count_latest_year,
    market.sales_count_latest_year as market_sales_count_latest_year
from {{ ref('rpt_area_profile_mvp') }} as profile
left join {{ ref('int_area__market') }} as market
    on profile.area_id = market.area_id
where
    profile.median_sale_price_gbp is distinct from market.median_sale_price_gbp
    or profile.sales_count_latest_year
        is distinct from coalesce(market.sales_count_latest_year, 0)
