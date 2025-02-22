'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (licence) {
  const { FGAC_REGION_CODE: regionCode, ID: id } = licence

  const licencePurposes = await _licencePurposes(id, regionCode)
  const licencePurposePoints = await _licencePurposePoints(licencePurposes, regionCode)
  const licencePurposeAgreements = await _licencePurposeAgreements(licencePurposes, regionCode)
  const licencePurposeConditions = await _licencePurposeConditions(licencePurposes, regionCode)

  await _assignPurposeTypesToLicencePurposes(licencePurposes)
  _assignDataToLicencePurposes(licencePurposes, licencePurposePoints, licencePurposeAgreements, licencePurposeConditions)

  return licencePurposes
}

function _assignDataToLicencePurposes (
  licencePurposes,
  licencePurposePoints,
  licencePurposeAgreements,
  licencePurposeConditions
) {
  for (const purpose of licencePurposes) {
    purpose.purposePoints = licencePurposePoints.filter((point) => {
      return point.AABP_ID === purpose.ID
    })

    purpose.licenceAgreements = licencePurposeAgreements.filter((agreement) => {
      return agreement.AABP_ID === purpose.ID
    })

    purpose.licenceConditions = licencePurposeConditions.filter((condition) => {
      return condition.AABP_ID === purpose.ID
    })
  }
}

async function _assignPurposeTypesToLicencePurposes (licencePurposes) {
  for (const licencePurpose of licencePurposes) {
    const params = [licencePurpose.APUR_APPR_CODE, licencePurpose.APUR_APSE_CODE, licencePurpose.APUR_APUS_CODE]
    const query = `
      SELECT
        row_to_json(p1.*) AS purpose_primary,
        row_to_json(p2.*) AS purpose_secondary,
        row_to_json(p3.*) AS purpose_tertiary
      FROM
        "import"."NALD_PURP_PRIMS" p1
      LEFT JOIN
        "import"."NALD_PURP_SECS" p2 on p2."CODE" = $2
      LEFT JOIN
        "import"."NALD_PURP_USES" p3 on p3."CODE" = $3
      WHERE
        p1."CODE" = $1;
    `

    const results = await db.query(query, params)

    licencePurpose.purpose = results
  }
}

async function _licencePurposes (id, regionCode) {
  const params = [id, regionCode]
  const query = `
    SELECT
      *
    FROM
      "import"."NALD_ABS_LIC_PURPOSES" p
    WHERE
      p."AABV_AABL_ID" = $1
      AND p."FGAC_REGION_CODE" = $2;
  `

  return db.query(query, params)
}

async function _licencePurposeAgreements (licencePurposes, regionCode) {
  const allLicencePurposeIds = licencePurposes.map((licencePurpose) => {
    return licencePurpose.ID
  })

  const params = [regionCode, [...new Set(allLicencePurposeIds)]]
  const query = `
    SELECT
      *
    FROM
      "import"."NALD_LIC_AGRMNTS"
    WHERE
      "FGAC_REGION_CODE" = $1
      AND "AABP_ID" = ANY ($2);
  `

  return db.query(query, params)
}

async function _licencePurposeConditions (licencePurposes, regionCode) {
  const allLicencePurposeIds = licencePurposes.map((licencePurpose) => {
    return licencePurpose.ID
  })

  const params = [regionCode, [...new Set(allLicencePurposeIds)]]
  const query = `
    SELECT
      c.*,
      row_to_json(ct.*) AS condition_type
    FROM
      "import"."NALD_LIC_CONDITIONS" c
    LEFT JOIN
      "import"."NALD_LIC_COND_TYPES" ct ON ct."CODE" = c."ACIN_CODE" AND ct."SUBCODE" = c."ACIN_SUBCODE"
    WHERE
      c."FGAC_REGION_CODE" = $1
      AND c."AABP_ID" = ANY ($2)
    ORDER BY
      c."DISP_ORD" ASC;
  `

  return db.query(query, params)
}

async function _licencePurposePoints (licencePurposes, regionCode) {
  const allLicencePurposeIds = licencePurposes.map((licencePurpose) => {
    return licencePurpose.ID
  })

  const params = [regionCode, [...new Set(allLicencePurposeIds)]]
  const query = `
    SELECT
      pp.*,
      row_to_json(m.*) as means_of_abstraction,
      row_to_json(p.*) as point_detail,
      row_to_json(s.*) as point_source
    FROM
      "import"."NALD_ABS_PURP_POINTS" pp
    LEFT JOIN
      "import"."NALD_MEANS_OF_ABS" m ON m."CODE" = pp."AMOA_CODE"
    LEFT JOIN
      "import"."NALD_POINTS" p ON p."ID" = pp."AAIP_ID" AND p."FGAC_REGION_CODE" = pp."FGAC_REGION_CODE"
    LEFT JOIN
      "import"."NALD_SOURCES" s ON s."CODE" = p."ASRC_CODE"
    WHERE
      pp."FGAC_REGION_CODE" = $1
      AND pp."AABP_ID" = ANY ($2);
  `

  return db.query(query, params)
}

module.exports = {
  go
}
