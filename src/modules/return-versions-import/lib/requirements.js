'use strict'

const db = require('../../../lib/connectors/db.js')

async function go () {
  await db.query(`
    insert into water.return_requirements  (
      return_version_id,
      legacy_id,
      abstraction_period_start_day,
      abstraction_period_start_month,
      abstraction_period_end_day,
      abstraction_period_end_month,
      site_description,
      description,
      is_summer,
      is_upload,
      external_id,
      returns_frequency,
      reporting_frequency,
      collection_frequency,
      two_part_tariff,
      date_created,
      date_updated
    )
    select
      rv.return_version_id,
      nrf."ID"::integer as legacy_id,
      nullif(nrf."ABS_PERIOD_ST_DAY", 'null')::smallint as abstraction_period_start_day,
      nullif(nrf."ABS_PERIOD_ST_MONTH", 'null')::smallint as abstraction_period_start_month,
      nullif(nrf."ABS_PERIOD_END_DAY", 'null')::smallint as abstraction_period_end_day,
      nullif(nrf."ABS_PERIOD_END_MONTH", 'null')::smallint as abstraction_period_end_month,
      nullif(nrf."SITE_DESCR", 'null') as site_description,
      nullif(nrf."DESCR", 'null') as description,
      nrf."FORM_PRODN_MONTH" in ('65', '45', '80') as is_summer,
      nrf."FORM_PRODN_MONTH" in ('65', '66') as is_upload,
      concat_ws(':', nrf."FGAC_REGION_CODE", nrf."ID") as external_id,
      (case nrf."ARTC_RET_FREQ_CODE"
        when 'D' then 'day'
        when 'W' then 'week'
        when 'F' then 'fortnight'
        when 'M' then 'month'
        when 'Q' then 'quarter'
        when 'A' then 'year'
        end
      )::water.returns_frequency as returns_frequency,
      (case nrf."ARTC_REC_FREQ_CODE"
        when 'D' then 'day'
        when 'W' then 'week'
        when 'F' then 'fortnight'
        when 'M' then 'month'
        when 'Q' then 'quarter'
        when 'A' then 'year'
        end
      ) as reporting_frequency,
      (case nrf."ARTC_CODE"
        when 'D' then 'day'
        when 'W' then 'week'
        when 'F' then 'fortnight'
        when 'M' then 'month'
        when 'Q' then 'quarter'
        when 'A' then 'year'
        end
      ) as collection_frequency,
      (case
        when nrf."TPT_FLAG" = 'Y' then TRUE
        else FALSE
        end) as two_part_tariff,
      now() as date_created,
      now() as date_updated
    from
      "import"."NALD_RET_FORMATS" nrf
    join water.return_versions rv
      on concat_ws(':', nrf."FGAC_REGION_CODE", nrf."ARVN_AABL_ID", nrf."ARVN_VERS_NO")=rv.external_id
    on conflict(external_id) do update set
      abstraction_period_start_day=excluded.abstraction_period_start_day,
      abstraction_period_start_month=excluded.abstraction_period_start_month,
      abstraction_period_end_day=excluded.abstraction_period_end_day,
      abstraction_period_end_month=excluded.abstraction_period_end_month,
      site_description=excluded.site_description,
      description=excluded.description,
      is_summer=excluded.is_summer,
      is_upload=excluded.is_upload,
      returns_frequency=excluded.returns_frequency,
      reporting_frequency=excluded.reporting_frequency,
      collection_frequency=excluded.collection_frequency,
      two_part_tariff=excluded.two_part_tariff,
      date_updated=excluded.date_updated;
  `)
}

module.exports = {
  go
}
