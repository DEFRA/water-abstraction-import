'use strict'

const helpers = require('@envage/water-abstraction-helpers')

const db = require('../../../lib/connectors/db.js')
const FetchReturnFormats = require('./fetch-return-formats.js')

async function go (licence, licenceVersions, licencePurposes) {
  const { FGAC_REGION_CODE: regionCode, ID: id } = licence

  const currentLicenceVersion = await _currentLicenceVersion(id, regionCode)

  _assignPartyDataToCurrentLicenceVersion(currentLicenceVersion, licenceVersions)

  const address = await _address(currentLicenceVersion.ACON_AADD_ID, currentLicenceVersion.FGAC_REGION_CODE)
  const licenceReturnFormats = await FetchReturnFormats.go(licence)

  return _transformCurrentLicenceVersion(licence, currentLicenceVersion, address, licencePurposes, licenceReturnFormats)
}

async function _address (id, regionCode) {
  const params = [id, regionCode]
  const query = 'SELECT a.* FROM import."NALD_ADDRESSES" a WHERE a."ID"=$1 and a."FGAC_REGION_CODE" = $2;'

  const results = await db.query(query, params)

  return results[0]
}

function _assignPartyDataToCurrentLicenceVersion (currentLicenceVersion, licenceVersions) {
  if (!currentLicenceVersion) {
    return
  }

  const { INCR_NO: currentIncrementNo, ISSUE_NO: currentIssueNo} = currentLicenceVersion
  const matchingLicenceVersion = licenceVersions.find((licenceVersion) => {
    return licenceVersion.ISSUE_NO === currentIssueNo && licenceVersion.INCR_NO === currentIncrementNo
  })
  currentLicenceVersion.party = matchingLicenceVersion.parties
}

async function _currentLicenceVersion (id, regionCode) {
  const params = [id, regionCode]
  const query = `
    SELECT
      v.*,
      t.*
    FROM
      "import"."NALD_ABS_LIC_VERSIONS" v
    INNER JOIN
      "import"."NALD_WA_LIC_TYPES" t ON v."WA_ALTY_CODE" = t."CODE"
    INNER JOIN
      "import"."NALD_ABS_LICENCES" l ON v."AABL_ID" = l."ID" AND l."FGAC_REGION_CODE" = v."FGAC_REGION_CODE"
    WHERE
      v."AABL_ID" = $1
      AND v."FGAC_REGION_CODE" = $2
      AND (0 = 0 AND "EFF_END_DATE" = 'null' OR to_date( "EFF_END_DATE", 'DD/MM/YYYY' ) > now())
      AND (
        0 = 0
        AND v."STATUS" = 'CURR'
        AND (l."EXPIRY_DATE" = 'null' OR to_date(l."EXPIRY_DATE", 'DD/MM/YYYY') > NOW())
        AND (l."LAPSED_DATE" = 'null' OR to_date(l."LAPSED_DATE", 'DD/MM/YYYY') > NOW())
        AND (l."REV_DATE" = 'null' OR to_date(l."REV_DATE", 'DD/MM/YYYY') > NOW())
        AND (v."EFF_ST_DATE"='null' OR to_date(v."EFF_ST_DATE", 'DD/MM/YYYY') <= NOW())
      )
    ORDER BY
      "ISSUE_NO" DESC,
      "INCR_NO" DESC
    LIMIT 1;
  `

  const results = await db.query(query, params)

  if (results.length === 0) {
    return null
  }

  return results[0]
}

function _transformCurrentLicenceVersion (licence, currentLicenceVersion, address, licencePurposes, licenceReturnFormats) {
  if (!currentLicenceVersion) {
    return null
  }

  const { INCR_NO: currentIncrementNo, ISSUE_NO: currentIssueNo} = currentLicenceVersion
  const matchingLicencePurposes = licencePurposes.filter((licencePurpose) => {
    return licencePurpose.AABV_ISSUE_NO === currentIssueNo && licencePurpose.AABV_INCR_NO === currentIncrementNo
  })

  return {
    licence: currentLicenceVersion,
    party: currentLicenceVersion.party[0],
    address,
    original_effective_date: helpers.nald.dates.calendarToSortable(licence.ORIG_EFF_DATE),
    version_effective_date: helpers.nald.dates.calendarToSortable(currentLicenceVersion.EFF_ST_DATE),
    expiry_date: helpers.nald.dates.calendarToSortable(licence.EXPIRY_DATE),
    purposes: matchingLicencePurposes,
    formats: licenceReturnFormats
  }
}

module.exports = {
  go
}
