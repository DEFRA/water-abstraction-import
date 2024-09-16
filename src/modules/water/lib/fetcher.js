'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (licenceRef) {
  const naldLicence = await _licence(licenceRef)
  const { ID: id, FGAC_REGION_CODE: regionCode } = naldLicence

  const naldLicenceVersions = await _licenceVersions(regionCode, id)
  const naldLicenceVersionPurposes = await _licenceVersionPurposes(regionCode, id)
  const naldLicenceVersionPurposeConditions = await _licenceVersionPurposeConditions(regionCode, id)
  const naldLicenceRoles = await _licenceRoles(regionCode, id)

  const { addressIds, partyIds } = _addressAndPartyIds(naldLicenceVersions, naldLicenceRoles)

  const naldAddresses = await _addresses(regionCode, addressIds)
  const naldParties = await _parties(regionCode, partyIds)

  const licencePriorToImport = await _licencePriorToImport(licenceRef)

  return {
    licencePriorToImport,
    naldAddresses,
    naldLicence,
    naldLicenceRoles,
    naldLicenceVersions,
    naldLicenceVersionPurposes,
    naldLicenceVersionPurposeConditions,
    naldParties
  }
}

async function _addresses (regionCode, addressIds) {
  const query = `
    SELECT
      "ID",
      "FGAC_REGION_CODE"
    FROM
      "import"."NALD_ADDRESSES"
    WHERE
      "FGAC_REGION_CODE" = $1
      AND "ID" = ANY (string_to_array($2, ',')::TEXT[]);
  `

  return db.query(query, [regionCode, addressIds.join(',')])
}

function _addressAndPartyIds (licenceVersions, licenceRoles) {
  const allAddressIds = []
  const allPartyIds = []

  licenceVersions.forEach((licenceVersion) => {
    allAddressIds.push(licenceVersion.ACON_AADD_ID)
    allPartyIds.push(licenceVersion.ACON_APAR_ID)
  })

  licenceRoles.forEach((licenceVersion) => {
    allAddressIds.push(licenceVersion.ACON_AADD_ID)
    allPartyIds.push(licenceVersion.ACON_APAR_ID)
  })

  const addressIds = [...new Set(allAddressIds)]
  const partyIds = [...new Set(allPartyIds)]

  return { addressIds, partyIds }
}

async function _licence (licenceRef) {
  const query = `
    SELECT
      "ID",
      "LIC_NO",
      "FGAC_REGION_CODE",
      "ORIG_EFF_DATE",
      "EXPIRY_DATE",
      "LAPSED_DATE",
      "REV_DATE",
      "AREP_EIUC_CODE",
      "AREP_AREA_CODE",
      "AREP_SUC_CODE",
      "AREP_LEAP_CODE"
    FROM
      "import"."NALD_ABS_LICENCES"
    WHERE "LIC_NO"=$1;
  `

  const results = await db.query(query, [licenceRef])

  return results[0]
}

async function _licencePriorToImport (licenceRef) {
  const query = `
    SELECT
      licence_id,
      expired_date,
      lapsed_date,
      revoked_date
    FROM
      water.licences
    WHERE
      licence_ref = $1;
  `

  const results = await db.query(query, [licenceRef])

  return results[0]
}

async function _licenceRoles (regionCode, id) {
  const query = `
    SELECT
      "ID",
      "FGAC_REGION_CODE",
      "EFF_ST_DATE",
      "EFF_END_DATE",
      "ACON_APAR_ID",
      "ACON_AADD_ID"
    FROM
      "import"."NALD_LIC_ROLES"
    WHERE
      "FGAC_REGION_CODE" = $1
      AND "AABL_ID" = $2
      AND "ALRT_CODE" = 'RT'
    ORDER BY
      to_date("EFF_ST_DATE", 'DD/MM/YYYY');
  `

  return db.query(query, [regionCode, id])
}

async function _licenceVersions (regionCode, id) {
  const query = `
    SELECT
      "AABL_ID",
      "FGAC_REGION_CODE",
      "ISSUE_NO",
      "INCR_NO",
      "STATUS",
      "EFF_ST_DATE",
      "EFF_END_DATE",
      "ACON_AADD_ID",
      "ACON_APAR_ID"
    FROM
      "import"."NALD_ABS_LIC_VERSIONS"
    WHERE
      "FGAC_REGION_CODE"=$1
      AND "AABL_ID"=$2
      AND "STATUS"<>'DRAFT';
  `
  const results = await db.query(query, [regionCode, id])

  if (results.length === 0) {
    throw new Error('Licence has no matching licence versions')
  }

  return results
}

async function _licenceVersionPurposes (regionCode, id) {
  const query = `
    SELECT
      purposes."ID",
      purposes."FGAC_REGION_CODE",
      purposes."INST_QTY",
      purposes."HOURLY_QTY",
      purposes."DAILY_QTY",
      purposes."ANNUAL_QTY",
      purposes."AABV_ISSUE_NO",
      purposes."AABV_INCR_NO",
      purposes."APUR_APPR_CODE",
      purposes."APUR_APSE_CODE",
      purposes."APUR_APUS_CODE",
      purposes."PERIOD_ST_DAY",
      purposes."PERIOD_ST_MONTH",
      purposes."PERIOD_END_DAY",
      purposes."PERIOD_END_MONTH",
      purposes."TIMELTD_ST_DATE",
      purposes."TIMELTD_END_DATE",
      purposes."NOTES"
    FROM
      "import"."NALD_ABS_LIC_VERSIONS" versions
    JOIN
      "import"."NALD_ABS_LIC_PURPOSES" purposes
    ON
      versions."AABL_ID" = purposes."AABV_AABL_ID"
      AND versions."ISSUE_NO" = purposes."AABV_ISSUE_NO"
      AND versions."INCR_NO" = purposes."AABV_INCR_NO"
      AND versions."FGAC_REGION_CODE" = purposes."FGAC_REGION_CODE"
    WHERE
      versions."FGAC_REGION_CODE" = $1
      AND versions."AABL_ID" = $2
      AND versions."STATUS"<>'DRAFT';
  `

  const results = await db.query(query, [regionCode, id])

  if (results.length === 0) {
    throw new Error('Licence has no matching licence version purposes')
  }

  return results
}

async function _licenceVersionPurposeConditions (regionCode, id) {
  const query = `
    SELECT
      conditions."ID",
      conditions."FGAC_REGION_CODE",
      conditions."AABP_ID",
      conditions."ACIN_CODE",
      conditions."ACIN_SUBCODE",
      conditions."PARAM1",
      conditions."PARAM2",
      conditions."TEXT"
    FROM
      "import"."NALD_ABS_LIC_VERSIONS" versions
    JOIN
      "import"."NALD_ABS_LIC_PURPOSES" purposes
    ON
      versions."AABL_ID" = purposes."AABV_AABL_ID"
      AND versions."ISSUE_NO" = purposes."AABV_ISSUE_NO"
      AND versions."INCR_NO" = purposes."AABV_INCR_NO"
      AND versions."FGAC_REGION_CODE" = purposes."FGAC_REGION_CODE"
    JOIN
      "import"."NALD_LIC_CONDITIONS" conditions
    ON
      purposes."FGAC_REGION_CODE" = conditions."FGAC_REGION_CODE"
      AND purposes."ID" = conditions."AABP_ID"
    WHERE
      versions."FGAC_REGION_CODE" = $1
      AND versions."AABL_ID" = $2
      AND versions."STATUS"<>'DRAFT';
  `

  return db.query(query, [regionCode, id])
}

async function _parties (regionCode, partyIds) {
  const query = `
    SELECT
      "ID",
      "FGAC_REGION_CODE"
    FROM
      "import"."NALD_PARTIES"
    WHERE
      "FGAC_REGION_CODE" = $1
      AND "ID" = ANY (string_to_array($2, ',')::TEXT[]);
  `

  return db.query(query, [regionCode, partyIds.join(',')])
}

module.exports = {
  go
}
