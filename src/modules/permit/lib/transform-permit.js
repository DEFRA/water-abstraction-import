'use strict'

const NaldDates = require('@envage/water-abstraction-helpers').nald.dates
const moment = require('moment')

const AddressQueries = require('./address-queries.js')
const CamQueries = require('./cam-queries.js')
const LicenceQueries = require('./licence-queries.js')
const PartyQueries = require('./party-queries.js')
const PurposeQueries = require('./purpose-queries.js')
const ReturnQueries = require('./return-queries.js')
const RoleQueries = require('./role-queries.js')

/**
 * Build packet of data to post to permit repository
 * @param {String} licenceRef - the licence number
 * @param {Number} regimeId - the numeric ID of the permitting regime
 * @param {Number} licenceTypeId - the ID of the licence type, e.g abstraction, impoundment etc
 * @param {Object} data - the licence JS object data
 * @return {Object} - packet of data for posting to permit repo
 */
function buildPermitRepoPacket (licenceRef, regimeId, licenceTypeId, data) {
  const latestVersion = _latestVersion(data.data.versions)
  const permitRepoData = {
    licence_ref: licenceRef,
    licence_start_dt: NaldDates.calendarToSortable(latestVersion.EFF_ST_DATE),
    licence_end_dt: _endDate(data),
    licence_status_id: '1',
    licence_type_id: licenceTypeId,
    licence_regime_id: regimeId,
    licence_data_value: JSON.stringify(data)
  }

  // remove null attributes so as not to anger JOI
  if (permitRepoData.licence_end_dt == null) {
    delete permitRepoData.licence_end_dt
  }

  if (permitRepoData.licence_start_dt == null) {
    delete permitRepoData.licence_start_dt
  }
  return permitRepoData
}

/**
 * Build full licence JSON for storing in permit repo from NALD import tables
 * @param {String} licenceNumber
 * @return {Promise} resolves with permit repo JSON packet
 */
async function getLicenceJson (licenceNumber) {
  const data = await LicenceQueries.getLicence(licenceNumber)
  const licenceRow = data[0]

  licenceRow.vmlVersion = 2
  licenceRow.data = {}
  licenceRow.data.versions = await _versionsJson(licenceRow)
  licenceRow.data.current_version = await _currentVersionJson(licenceRow)
  licenceRow.data.cams = await CamQueries.getCams(licenceRow.AREP_CAMS_CODE, licenceRow.FGAC_REGION_CODE)
  licenceRow.data.roles = await RoleQueries.getRoles(licenceRow.ID, licenceRow.FGAC_REGION_CODE)
  licenceRow.data.purposes = await _purposesJson(licenceRow)

  return licenceRow
}

function _calculateVersionScore (version) {
  // We * it by 1000 so ISSUE_NO goes to the top
  const issueNo = 1000 * parseInt(version.ISSUE_NO, 10)
  const incrNo = parseInt(version.INCR_NO, 10)
  return issueNo + incrNo
}

/**
 * Gets the JSON for the current version of the licence (if available)
 * @param {Object} licenceRow
 * return {Promise} resolves with object of current version, or null
 */
async function _currentVersionJson (licenceRow) {
  const regionCode = licenceRow.FGAC_REGION_CODE
  const currentVersion = await LicenceQueries.getCurrentVersion(licenceRow.ID, regionCode)

  if (currentVersion) {
    const data = {
      licence: currentVersion
    }

    data.licence.party = await PartyQueries.getParties(currentVersion.ACON_APAR_ID, regionCode)

    for (const p in data.licence.parties) {
      data.licence.parties[p].contacts = await PartyQueries.getPartyContacts(currentVersion.parties[p].ID, regionCode)
    }
    data.party = (await PartyQueries.getParty(currentVersion.ACON_APAR_ID, regionCode))[0]
    data.address = (await AddressQueries.getAddress(currentVersion.ACON_AADD_ID, regionCode))[0]
    data.original_effective_date = NaldDates.calendarToSortable(licenceRow.ORIG_EFF_DATE)
    data.version_effective_date = NaldDates.calendarToSortable(currentVersion.EFF_ST_DATE)
    data.expiry_date = NaldDates.calendarToSortable(licenceRow.EXPIRY_DATE)

    data.purposes = await _purposesJson(licenceRow, currentVersion)
    data.formats = await _returnFormats(licenceRow.ID, regionCode)

    return data
  }

  return null
}

/**
 * End date is the minimum of expiry date, revoked date and lapsed date
 * @param {Object} data - licence data
 * @return {String} date YYYY-MM-DD or null
 */
function _endDate (data = {}) {
  const dates = [
    data.EXPIRY_DATE,
    data.REV_DATE,
    data.LAPSED_DATE
  ]

  const filteredDates = dates.filter((naldDate) => {
    return moment(naldDate, 'DD/MM/YYYY').isValid()
  })

  const formattedFilteredDates = filteredDates.map((filteredDate) => {
    return moment(filteredDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
  })

  const sortedFormattedFilteredDates = formattedFilteredDates.sort()

  return sortedFormattedFilteredDates[0]
}

/**
 * Gets the latest version of the specified licence data
 * by sorting on the effective start date of the versions array
 * - Note: this may not be the current version
 * @param {Array} versions - licence data versions array from NALD import process
 * @return {Object} latest version
 */
function _latestVersion (versions) {
  versions.sort((version1, version2) => {
    const total1 = _calculateVersionScore(version1)
    const total2 = _calculateVersionScore(version2)

    if (total1 < total2) return 1
    if (total1 > total2) return -1
    return 0
  })

  return versions[0]
}

/**
 * Gets the purposes together with their points, agreements and conditions
 * for the specified current version
 * @param {Object} licenceRow
 * @param {Object} [currentVersion] - optional current version
 * @return {Promise}
 */
async function _purposesJson (licenceRow, currentVersion = null) {
  const regionCode = licenceRow.FGAC_REGION_CODE
  let purposes
  if (currentVersion) {
    purposes = await PurposeQueries.getPurposes(licenceRow.ID, regionCode, currentVersion.ISSUE_NO, currentVersion.INCR_NO)
  } else {
    purposes = await PurposeQueries.getPurposes(licenceRow.ID, regionCode)
  }

  for (const purpose of purposes) {
    purpose.purpose = await PurposeQueries.getPurpose({
      primary: purpose.APUR_APPR_CODE,
      secondary: purpose.APUR_APSE_CODE,
      tertiary: purpose.APUR_APUS_CODE
    })
    purpose.purposePoints = await PurposeQueries.getPurposePoints(purpose.ID, regionCode)
    purpose.licenceAgreements = await PurposeQueries.getPurposePointLicenceAgreements(purpose.ID, regionCode)
    purpose.licenceConditions = await PurposeQueries.getPurposePointLicenceConditions(purpose.ID, regionCode)
  }
  return purposes
}

/**
 * Gets current return formats for specified licence ID and region code
 * @param {Number} licenceId - from NALD_ABS_LICENCES table
 * @param {Number} regionCode - FGAC_REGION_CODE
 * @return {Promise} resolves with formats and purposes/points
 */
async function _returnFormats (licenceId, regionCode) {
  const formats = await LicenceQueries.getCurrentFormats(licenceId, regionCode)

  for (const format of formats) {
    format.points = await ReturnQueries.getFormatPoints(format.ID, regionCode)
    format.purposes = await ReturnQueries.getFormatPurposes(format.ID, regionCode)
  }

  return formats
}

/**
 * Gets all licence versions (including current)
 * @param {Object} licenceRow
 * @return {Promise} resolves with versions array
 */
async function _versionsJson (licenceRow) {
  const versions = await LicenceQueries.getVersions(licenceRow.ID, licenceRow.FGAC_REGION_CODE)

  for (const version of versions) {
    version.parties = await PartyQueries.getParties(version.ACON_APAR_ID, licenceRow.FGAC_REGION_CODE)
    for (const party of version.parties) {
      party.contacts = await PartyQueries.getPartyContacts(party.ID, licenceRow.FGAC_REGION_CODE)
    }
  }
  return versions
}

module.exports = {
  buildPermitRepoPacket,
  getLicenceJson
}
