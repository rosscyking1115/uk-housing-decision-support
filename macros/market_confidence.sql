{% macro market_confidence(sales_count_expression) %}
    case
        when coalesce({{ sales_count_expression }}, 0) = 0 then 'none'
        when {{ sales_count_expression }} < {{ var('min_reliable_sale_sample') }}
            then 'indicative'
        else 'reliable'
    end
{% endmacro %}
