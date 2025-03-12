'use strict'

const db = require('../../../lib/connectors/db.js')

async function go () {
  await db.query(`
    INSERT INTO water.licence_version_purposes (
      licence_version_id,
      purpose_primary_id,
      purpose_secondary_id,
      purpose_use_id,
      abstraction_period_start_day,
      abstraction_period_start_month,
      abstraction_period_end_day,
      abstraction_period_end_month,
      time_limited_start_date,
      time_limited_end_date,
      notes,
      annual_quantity,
      daily_quantity,
      hourly_quantity,
      instant_quantity,
      external_id,
      date_created,
      date_updated
    )
    SELECT
      lv.licence_version_id,
      pp.purpose_primary_id,
      ps.purpose_secondary_id,
      pu.purpose_use_id,
      nullif(nalp."PERIOD_ST_DAY", 'null')::smallint AS abstraction_period_start_day,
      nullif(nalp."PERIOD_ST_MONTH", 'null')::smallint AS abstraction_period_start_month,
      nullif(nalp."PERIOD_END_DAY", 'null')::smallint AS abstraction_period_end_day,
      nullif(nalp."PERIOD_END_MONTH", 'null')::smallint AS abstraction_period_end_month,
      (CASE
        WHEN nalp."TIMELTD_ST_DATE" = 'null' THEN NULL
        ELSE to_date(nalp."TIMELTD_ST_DATE", 'DD/MM/YYYY')
      END) AS time_limited_start_date,
      (CASE
        WHEN nalp."TIMELTD_END_DATE" = 'null' THEN NULL
        ELSE to_date(nalp."TIMELTD_END_DATE", 'DD/MM/YYYY')
      END) AS time_limited_end_date,
      nullif(nalp."NOTES", 'null') AS notes,
      nullif(nalp."ANNUAL_QTY", 'null')::numeric AS annual_quantity,
      nullif(nalp."DAILY_QTY", 'null')::numeric AS daily_quantity,
      nullif(nalp."HOURLY_QTY", 'null')::numeric AS hourly_quantity,
      nullif(nalp."INST_QTY", 'null')::numeric AS instant_quantity,
      concat_ws(':', nalp."FGAC_REGION_CODE", nalp."ID") AS external_id,
      now() AS date_created,
      now() AS date_updated
    FROM
      "import"."NALD_ABS_LIC_PURPOSES" nalp
    INNER JOIN water.licence_versions lv
      ON concat_ws(':', nalp."FGAC_REGION_CODE", nalp."AABV_AABL_ID", nalp."AABV_ISSUE_NO", nalp."AABV_INCR_NO") = lv.external_id
    INNER JOIN water.purposes_primary pp
      ON pp.legacy_id = nalp."APUR_APPR_CODE"
    INNER JOIN water.purposes_secondary ps
      ON ps.legacy_id = nalp."APUR_APSE_CODE"
    INNER JOIN water.purposes_uses pu
      ON pu.legacy_id = nalp."APUR_APUS_CODE"
    ON CONFLICT(external_id)
    DO UPDATE SET
      purpose_primary_id = excluded.purpose_primary_id,
      purpose_secondary_id = excluded.purpose_secondary_id,
      purpose_use_id = excluded.purpose_use_id,
      abstraction_period_start_day = excluded.abstraction_period_start_day,
      abstraction_period_start_month = excluded.abstraction_period_start_month,
      abstraction_period_end_day = excluded.abstraction_period_end_day,
      abstraction_period_end_month = excluded.abstraction_period_end_month,
      time_limited_start_date = excluded.time_limited_start_date,
      time_limited_end_date = excluded.time_limited_end_date,
      notes = excluded.notes,
      annual_quantity = excluded.annual_quantity,
      daily_quantity = excluded.daily_quantity,
      hourly_quantity = excluded.hourly_quantity,
      instant_quantity = excluded.instant_quantity,
      date_updated = excluded.date_updated;
  `)
}

module.exports = {
  go
}
