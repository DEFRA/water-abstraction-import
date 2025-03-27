'use strict'

const db = require('../../../lib/connectors/db.js')

async function go () {
  await db.query(`
    INSERT INTO water.licences (
      region_id,
      licence_ref,
      is_water_undertaker,
      regions,
      start_date,
      expired_date,
      lapsed_date,
      revoked_date,
      date_created,
      date_updated
    )
    SELECT
      r.region_id,
      nal."LIC_NO" AS licence_ref,
      (CASE
        WHEN nal."AREP_EIUC_CODE" LIKE '%SWC' THEN TRUE
        ELSE FALSE
      END) AS is_water_undertaker,
      json_build_object(
        'historicalAreaCode', nal."AREP_AREA_CODE",
        'regionalChargeArea', (
          CASE
            WHEN nal."AREP_EIUC_CODE" LIKE 'AN%' THEN 'Anglian'
            WHEN nal."AREP_EIUC_CODE" LIKE 'MD%' THEN 'Midlands'
            WHEN nal."AREP_EIUC_CODE" LIKE 'NO%' THEN 'Northumbria'
            WHEN nal."AREP_EIUC_CODE" LIKE 'NW%' THEN 'North West'
            WHEN nal."AREP_EIUC_CODE" LIKE 'SO%' THEN 'Southern'
            WHEN nal."AREP_EIUC_CODE" LIKE 'SW%' THEN 'South West (incl Wessex)'
            WHEN nal."AREP_EIUC_CODE" LIKE 'TH%' THEN 'Thames'
            WHEN nal."AREP_EIUC_CODE" LIKE 'WL%' THEN 'Wales'
            WHEN nal."AREP_EIUC_CODE" LIKE 'YO%' THEN 'Yorkshire'
          END),
        'standardUnitChargeCode', nal."AREP_SUC_CODE",
        'localEnvironmentAgencyPlanCode', nal."AREP_LEAP_CODE"
      ) AS regions,
      to_date(nal."ORIG_EFF_DATE", 'DD/MM/YYYY') AS start_date,
      (CASE
        WHEN nal."EXPIRY_DATE" = 'null' THEN NULL
        ELSE to_date(nal."EXPIRY_DATE", 'DD/MM/YYYY')
      END) AS expiry_date,
      (CASE
        WHEN nal."LAPSED_DATE" = 'null' THEN NULL
        ELSE to_date(nal."LAPSED_DATE", 'DD/MM/YYYY')
      END) AS lapsed_date,
      (CASE
        WHEN nal."REV_DATE" = 'null' THEN NULL
        ELSE to_date(nal."REV_DATE", 'DD/MM/YYYY')
      END) AS revoked_date,
      now() AS date_created,
      now() AS date_updated
    FROM
      "import"."NALD_ABS_LICENCES" nal
    INNER JOIN
      water.regions r ON r.nald_region_id = (nal."FGAC_REGION_CODE")::int
    WHERE
      nal."ORIG_EFF_DATE" <> 'null'
      AND EXISTS (
        SELECT
          1
        FROM
          "import"."NALD_ABS_LIC_VERSIONS" nalv
        WHERE
          nalv."AABL_ID" = nal."ID"
          AND nalv."FGAC_REGION_CODE" = nal."FGAC_REGION_CODE"
          AND nalv."STATUS" <> 'DRAFT'
      )
    ON CONFLICT (licence_ref)
    DO UPDATE SET
      is_water_undertaker = excluded.is_water_undertaker,
      regions = excluded.regions,
      start_date = excluded.start_date,
      expired_date = excluded.expired_date,
      lapsed_date = excluded.lapsed_date,
      revoked_date = excluded.revoked_date,
      date_updated = excluded.date_updated;
  `)
}

module.exports = {
  go
}
