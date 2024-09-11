'use strict'

const db = require('../../../lib/connectors/db.js')

async function getFormatPoints (formatId, regionCode) {
  const query = `
    SELECT
      p.*
    FROM
      "import"."NALD_RET_FMT_POINTS" fp
    LEFT JOIN "import"."NALD_POINTS" p
      ON fp."AAIP_ID" = p."ID"
      AND fp."FGAC_REGION_CODE" = p."FGAC_REGION_CODE"
    WHERE
      fp."ARTY_ID" = $1
      AND fp."FGAC_REGION_CODE" = $2;
  `

  return db.query(query, [formatId, regionCode])
}

async function getFormatPurposes (formatId, regionCode) {
  const query = `
    SELECT p.*,
      p1."DESCR" AS primary_purpose,
      p2."DESCR" AS secondary_purpose,
      p3."DESCR" AS tertiary_purpose
    FROM
      "import"."NALD_RET_FMT_PURPOSES" p
      LEFT JOIN "import"."NALD_PURP_PRIMS" p1
        ON p."APUR_APPR_CODE" = p1."CODE"
      LEFT JOIN "import"."NALD_PURP_SECS" p2
        ON p."APUR_APSE_CODE" = p2."CODE"
      LEFT JOIN "import"."NALD_PURP_USES" p3
        ON p."APUR_APUS_CODE" = p3."CODE"
    WHERE
      p."ARTY_ID" = $1
      AND p."FGAC_REGION_CODE" = $2;
  `

  return db.query(query, [formatId, regionCode])
}

module.exports = {
  getFormatPurposes,
  getFormatPoints
}
