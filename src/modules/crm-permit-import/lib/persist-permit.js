'use strict'

const helpers = require('@envage/water-abstraction-helpers')

const DateHelpers = require('../../../lib/date-helpers.js')
const db = require('../../../lib/connectors/db.js')

async function go (licenceData) {
  const startDate = _latestLicenceVersionStartDate(licenceData.data.versions)
  const endDate = DateHelpers.getMinDate([licenceData.EXPIRY_DATE, licenceData.LAPSED_DATE, licenceData.REV_DATE], true)

  return _persist(licenceData, startDate, endDate)
}

/**
 * Gets the EFF_ST_DATE of the latest version of the specified licence data by sorting on the effective start date of
 * the versions array
 *
 * Note: This may not be the current version
 *
 * @private
 */
function _latestLicenceVersionStartDate (licenceVersions) {
  licenceVersions.sort((version1, version2) => {
    const version1Score = _licenceVersionSortScore(version1)
    const version2Score = _licenceVersionSortScore(version2)

    if (version1Score < version2Score) {
      return 1
    }

    if (version1Score > version2Score) {
      return -1
    }

    return 0
  })

  return helpers.nald.dates.calendarToSortable(licenceVersions[0].EFF_ST_DATE)
}

function _licenceVersionSortScore (licenceVersion) {
  // We * it by 1000 so ISSUE_NO goes to the top
  const issueNo = 1000 * parseInt(licenceVersion.ISSUE_NO, 10)
  const incrNo = parseInt(licenceVersion.INCR_NO, 10)

  return issueNo + incrNo
}

async function _persist (licenceData, startDate, endDate) {
  const params = [
    licenceData.LIC_NO,
    startDate,
    endDate,
    JSON.stringify(licenceData)
  ]

  const query = `
    INSERT INTO permit.licence (
      licence_status_id,
      licence_type_id,
      licence_regime_id,
      licence_ref,
      licence_start_dt,
      licence_end_dt,
      licence_data_value
    )
    VALUES (1, 8, 1, $1, $2, $3, $4)
    ON CONFLICT (
      licence_regime_id,
      licence_type_id,
      licence_ref
    ) DO UPDATE SET
      licence_start_dt = EXCLUDED.licence_start_dt,
      licence_end_dt = EXCLUDED.licence_end_dt,
      licence_data_value = EXCLUDED.licence_data_value
    RETURNING
      licence_id;
  `

  const results = await db.query(query, params)

  return results[0].licence_id
}

module.exports = {
  go
}
