'use strict'

const db = require('../../../lib/connectors/db.js')

async function getLicence (licenceNo) {
  const query = `
    SELECT
      l.*,
      to_date(nullif(l."ORIG_EFF_DATE", 'null'), 'DD/MM/YYYY') AS start_date,
      LEAST(
        to_date(nullif(l."EXPIRY_DATE", 'null'), 'DD/MM/YYYY'),
        to_date(nullif(l."REV_DATE", 'null'), 'DD/MM/YYYY'),
        to_date(nullif(l."LAPSED_DATE", 'null'), 'DD/MM/YYYY')
      ) AS end_date
    FROM
      "import"."NALD_ABS_LICENCES" l
    WHERE
      l."LIC_NO" = $1;
  `

  return db.query(query, [licenceNo])
}

async function getCurrentVersion (licenceId, regionCode) {
  const query = `
    SELECT v.*, t.*
    FROM import."NALD_ABS_LIC_VERSIONS" v
      JOIN import."NALD_WA_LIC_TYPES" t
        ON v."WA_ALTY_CODE" = t."CODE"
      JOIN import."NALD_ABS_LICENCES" l
        ON v."AABL_ID" = l."ID"
        AND l."FGAC_REGION_CODE" = v."FGAC_REGION_CODE"
    WHERE "AABL_ID" = $1
    AND v."FGAC_REGION_CODE" = $2
    AND (
      0 = 0
      AND "EFF_END_DATE" = 'null'
      OR to_date( "EFF_END_DATE", 'DD/MM/YYYY' ) > now()
    )
    AND (
      0 = 0
      AND v."STATUS" = 'CURR'
      AND (
        l."EXPIRY_DATE" = 'null'
        OR to_date(l."EXPIRY_DATE", 'DD/MM/YYYY') > NOW()
      )
      AND (
        l."LAPSED_DATE" = 'null' OR to_date(l."LAPSED_DATE", 'DD/MM/YYYY') > NOW()
      )
      AND (
        l."REV_DATE" = 'null' OR to_date(l."REV_DATE", 'DD/MM/YYYY') > NOW()
      )
      AND (
        v."EFF_ST_DATE"='null' OR to_date(v."EFF_ST_DATE", 'DD/MM/YYYY') <= NOW()
      )
    )
    ORDER BY "ISSUE_NO" DESC, "INCR_NO" DESC
    LIMIT 1;
  `

  const rows = await db.query(query, [licenceId, regionCode])

  return rows.length ? rows[0] : null
}

async function getVersions (licenceId, regionCode) {
  const query = 'SELECT * FROM "import"."NALD_ABS_LIC_VERSIONS" WHERE "AABL_ID" = $1 AND "FGAC_REGION_CODE" = $2;'

  return db.query(query, [licenceId, regionCode])
}

async function getCurrentFormats (licenceId, regionCode) {
  const query = `
    SELECT
      f.*
    FROM
      "import"."NALD_RET_VERSIONS" rv
    JOIN
      "import"."NALD_RET_FORMATS" f
      ON f."ARVN_AABL_ID" = $1
      AND f."FGAC_REGION_CODE" = $2
      AND rv."VERS_NO" = f."ARVN_VERS_NO"
    WHERE
      rv."AABL_ID" = $1
      AND rv."FGAC_REGION_CODE" = $2
      AND rv."STATUS" = 'CURR';
  `

  return db.query(query, [licenceId, regionCode])
}

module.exports = {
  getLicence,
  getCurrentVersion,
  getVersions,
  getCurrentFormats
}
