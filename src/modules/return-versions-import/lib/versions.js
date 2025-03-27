'use strict'

const db = require('../../../lib/connectors/db.js')

async function go () {
  await db.query(`
    INSERT INTO water.return_versions (
      licence_id,
      version_number,
      start_date,
      end_date,
      status,
      external_id,
      date_created,
      date_updated
    )
    SELECT
      l.licence_id,
      nrv."VERS_NO"::integer AS version_number,
      to_date(nrv."EFF_ST_DATE", 'DD/MM/YYYY') AS start_date,
      CASE nrv."EFF_END_DATE"
        WHEN 'null' THEN NULL
        ELSE to_date(nrv."EFF_END_DATE", 'DD/MM/YYYY')
      END AS end_date,
      (
        CASE nrv."STATUS"
          WHEN 'SUPER' THEN 'superseded'
          WHEN 'DRAFT' THEN 'draft'
          WHEN 'CURR' THEN 'current'
        END
      )::water.return_version_status AS status,
      concat_ws(':', nrv."FGAC_REGION_CODE", nrv."AABL_ID", nrv."VERS_NO") AS external_id,
      NOW() AS date_created,
      NOW() AS date_updated
    FROM
      import."NALD_RET_VERSIONS" nrv
    JOIN import."NALD_ABS_LICENCES" nl
      ON nrv."AABL_ID" = nl."ID"
      AND nrv."FGAC_REGION_CODE" = nl."FGAC_REGION_CODE"
    JOIN water.licences l
      ON l.licence_ref = nl."LIC_NO"
    ON CONFLICT (external_id) DO
    UPDATE SET
      licence_id = excluded.licence_id,
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      status = excluded.status,
      date_updated = excluded.date_updated;
  `)
}

module.exports = {
  go
}
