'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (licence) {
  const { FGAC_REGION_CODE: regionCode, ID: id } = licence

  const licenceReturnFormats = await _licenceReturnFormats(id, regionCode)
  const licenceReturnFormatPurposes = await _licenceReturnFormatPurposes(licenceReturnFormats, regionCode)

  await _assignPointsToLicenceReturnFormats(licenceReturnFormats)
  _assignPurposesLicenceReturnFormats(licenceReturnFormats, licenceReturnFormatPurposes)

  return licenceReturnFormats
}

async function _assignPointsToLicenceReturnFormats (licenceReturnFormats) {
  for (const licenceReturnFormat of licenceReturnFormats) {
    const params = [licenceReturnFormat.ID, licenceReturnFormat.FGAC_REGION_CODE]
    const query = `
      SELECT
        p.*
      FROM
        "import"."NALD_RET_FMT_POINTS" fp
      LEFT JOIN
        "import"."NALD_POINTS" p ON fp."AAIP_ID" = p."ID" AND fp."FGAC_REGION_CODE" = p."FGAC_REGION_CODE"
      WHERE
        fp."ARTY_ID" = $1
        AND fp."FGAC_REGION_CODE" = $2;
    `

    licenceReturnFormat.points = await db.query(query, params)
  }
}

function _assignPurposesLicenceReturnFormats (licenceReturnFormats, licenceReturnFormatPurposes) {
  for (const format of licenceReturnFormats) {
    format.purposes = licenceReturnFormatPurposes.filter((purpose) => {
      return purpose.ARTY_ID === format.ID
    })
  }
}

async function _licenceReturnFormats (id, regionCode) {
  const params = [id, regionCode]
  const query = `
    SELECT
      f.*
    FROM
      "import"."NALD_RET_VERSIONS" rv
    INNER JOIN
      "import"."NALD_RET_FORMATS" f
      ON
        f."ARVN_AABL_ID" = rv."AABL_ID"
        AND f."FGAC_REGION_CODE" = rv."FGAC_REGION_CODE"
        AND f."ARVN_VERS_NO" = rv."VERS_NO"
    WHERE
      rv."AABL_ID" = $1
      AND rv."FGAC_REGION_CODE" = $2
      AND rv."STATUS" = 'CURR';
  `

  return db.query(query, params)
}

async function _licenceReturnFormatPurposes (licenceReturnFormats, regionCode) {
  const allLicenceReturnFormatIds = licenceReturnFormats.map((licenceReturnFormat) => {
    return licenceReturnFormat.ID
  })

  const params = [regionCode, [...new Set(allLicenceReturnFormatIds)]]
  const query = `
    SELECT
      p.*,
      p1."DESCR" AS primary_purpose,
      p2."DESCR" AS secondary_purpose,
      p3."DESCR" AS tertiary_purpose
    FROM
      "import"."NALD_RET_FMT_PURPOSES" p
    LEFT JOIN
      "import"."NALD_PURP_PRIMS" p1 ON p."APUR_APPR_CODE" = p1."CODE"
    LEFT JOIN
      "import"."NALD_PURP_SECS" p2 ON p."APUR_APSE_CODE" = p2."CODE"
    LEFT JOIN
      "import"."NALD_PURP_USES" p3 ON p."APUR_APUS_CODE" = p3."CODE"
    WHERE
      p."FGAC_REGION_CODE" = $1
      AND p."ARTY_ID" = ANY ($2);
  `

  return db.query(query, params)
}

module.exports = {
  go
}
