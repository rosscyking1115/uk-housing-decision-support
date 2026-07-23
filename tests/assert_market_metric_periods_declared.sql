-- Area price context is explicitly tied to the configured latest Land Registry
-- year; regional reports must stay inside the configured analysis window.

select
    'area_profile_reference_year' as failure_type,
    area_id as key_value,
    sale_price_reference_year as observed_year
from {{ ref('rpt_area_profile_mvp') }}
where sale_price_reference_year <> {{ var('landreg_end_year') }}

union all

select
    'regional_yoy_window' as failure_type,
    concat(region, ':', transferred_year) as key_value,
    transferred_year as observed_year
from {{ ref('rpt_price_yoy_by_region') }}
where transferred_year not between {{ var('landreg_start_year') }} and {{ var('landreg_end_year') }}

union all

select
    'regional_new_build_window' as failure_type,
    concat(region, ':', transferred_year) as key_value,
    transferred_year as observed_year
from {{ ref('rpt_new_build_premium') }}
where transferred_year not between {{ var('landreg_start_year') }} and {{ var('landreg_end_year') }}
