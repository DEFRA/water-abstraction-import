'use strict'

const db = require('../../../lib/connectors/db.js')

async function go () {
  await db.query(`
    INSERT INTO water.licence_versions (
      licence_id,
      issue,
      "increment",
      status,
      start_date,
      end_date,
      external_id,
      date_created,
      date_updated
    )
    SELECT
      l.licence_id,
      (nalv."ISSUE_NO")::int AS issue,
      (nalv."INCR_NO")::int AS "increment",
      (CASE
        WHEN nalv."STATUS" = 'CURR' THEN 'current'
        ELSE 'superseded'
      END)::water.licence_version_status AS status,
      (CASE
        WHEN nalv."EFF_ST_DATE" = 'null' THEN NULL
        ELSE to_date(nalv."EFF_ST_DATE", 'DD/MM/YYYY')
      END) AS start_date,
      (CASE
        WHEN nalv."EFF_END_DATE" = 'null' THEN NULL
        ELSE to_date(nalv."EFF_END_DATE", 'DD/MM/YYYY')
      END) AS end_date,
      concat_ws(':', nalv."FGAC_REGION_CODE", nalv."AABL_ID", nalv."ISSUE_NO", nalv."INCR_NO") AS external_id,
      now() AS date_created,
      now() AS date_updated
    FROM
      "import"."NALD_ABS_LIC_VERSIONS" nalv
    INNER JOIN "import"."NALD_ABS_LICENCES" nal
      ON nal."FGAC_REGION_CODE" = nalv."FGAC_REGION_CODE" AND nal."ID" = nalv."AABL_ID"
    INNER JOIN water.licences l
      ON l.licence_ref = nal."LIC_NO"
    ON CONFLICT(external_id)
    DO UPDATE SET
      licence_id = excluded.licence_id,
      status = excluded.status,
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      date_updated = excluded.date_updated;
  `)
}

module.exports = {
  go
}
