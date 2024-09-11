'use strict'

const db = require('../../../lib/connectors/db.js')

async function getPurposes (licenceId, regionCode, issueNo, incrementNo) {
  let params = [licenceId, regionCode]
  let query = 'SELECT * FROM "import"."NALD_ABS_LIC_PURPOSES" WHERE "AABV_AABL_ID" = $1 AND "FGAC_REGION_CODE" = $2;'

  if (issueNo && incrementNo) {
    query = `
      SELECT
        *
      FROM
        "import"."NALD_ABS_LIC_PURPOSES"
      WHERE
        "AABV_AABL_ID" = $1
        AND "FGAC_REGION_CODE" = $2
        AND "AABV_ISSUE_NO" = $3
        AND "AABV_INCR_NO" = $4;
    `
    params = [licenceId, regionCode, issueNo, incrementNo]
  }

  return db.query(query, params)
}

async function getPurposePoints (purposeId, regionCode) {
  const query = `
    SELECT
      pp.*,
      row_to_json(m.*) AS means_of_abstraction,
      row_to_json(p.*) AS point_detail,
      row_to_json(s.*) AS point_source
    FROM
      import."NALD_ABS_PURP_POINTS" pp
    LEFT JOIN "import"."NALD_MEANS_OF_ABS" m ON m."CODE" = pp."AMOA_CODE"
    LEFT JOIN "import"."NALD_POINTS" p ON p."ID" = pp."AAIP_ID"
    LEFT JOIN "import"."NALD_SOURCES" s ON s."CODE" = p."ASRC_CODE"
    WHERE
      pp."AABP_ID" = $1
      AND pp."FGAC_REGION_CODE" = $2
      AND p."FGAC_REGION_CODE" = $2;
  `

  return db.query(query, [purposeId, regionCode])
}

async function getPurpose (purpose) {
  const { primary, secondary, tertiary } = purpose
  const query = `
    SELECT
      row_to_json(p1.*) AS purpose_primary,
      row_to_json(p2.*) AS purpose_secondary,
      row_to_json(p3.*) AS purpose_tertiary
    FROM
      "import"."NALD_PURP_PRIMS" p1
    LEFT JOIN "import"."NALD_PURP_SECS" p2 ON p2."CODE" = $2
    LEFT JOIN "import"."NALD_PURP_USES" p3 ON p3."CODE" = $3
    WHERE
      p1."CODE" = $1;
  `

  return db.query(query, [primary, secondary, tertiary])
}

async function getPurposePointLicenceAgreements (licenceId, regionCode) {
  const query = 'SELECT * FROM "import"."NALD_LIC_AGRMNTS" WHERE "AABP_ID" = $1 AND "FGAC_REGION_CODE" = $2;'

  return db.query(query, [licenceId, regionCode])
}

const getPurposePointLicenceConditions = async (licenceId, regionCode) => {
  const query = `
    SELECT
      c.*, row_to_json(ct.*) AS condition_type
    FROM
      "import"."NALD_LIC_CONDITIONS" c
    LEFT JOIN "import"."NALD_LIC_COND_TYPES" ct
      ON ct."CODE" = c."ACIN_CODE"
      AND ct."SUBCODE" = c."ACIN_SUBCODE"
    where
      c."AABP_ID" = $1
      AND c."FGAC_REGION_CODE" = $2
    order by
      "DISP_ORD" asc;
  `

  return db.query(query, [licenceId, regionCode])
}

module.exports = {
  getPurpose,
  getPurposePointLicenceAgreements,
  getPurposePointLicenceConditions,
  getPurposePoints,
  getPurposes
}
