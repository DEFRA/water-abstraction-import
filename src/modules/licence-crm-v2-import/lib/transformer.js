'use strict'

const DateHelpers = require('../../../lib/date-helpers.js')

function go (permitData) {
  const document = _document(permitData)
  const documentRoles = _documentRoles(permitData, document)

  return { document, documentRoles }
}

function _document (permitData) {
  const startDate = _startDate(permitData)
  const endDate = DateHelpers.getEndDate(permitData)

  return {
    documentRef: permitData.LIC_NO,
    startDate,
    endDate,
    externalId: `${permitData.FGAC_REGION_CODE}:${permitData.ID}`
  }
}

function _documentRoles (permitData, document) {
  const licenceHolderRoles = _licenceHolderRoles(permitData, document)
  const returnsToRoles = _returnsToRoles(permitData)

  return [...licenceHolderRoles, ...returnsToRoles]
}

function _licenceHolderRoles (permitData, document) {
  const sortedLicenceVersions = _sortLicenceVersions(permitData.data.versions)

  return sortedLicenceVersions.map((licenceVersion) => {
    const licenceVersionStartDate = DateHelpers.mapNaldDate(licenceVersion.EFF_ST_DATE)
    const startDate = DateHelpers.getMaxDate([document.startDate, licenceVersionStartDate], false)

    const licenceVersionEndDate = DateHelpers.mapNaldDate(licenceVersion.EFF_END_DATE)
    const endDate = DateHelpers.getMinDate([document.endDate, licenceVersionEndDate], false)

    const partyExternalId = `${permitData.FGAC_REGION_CODE}:${licenceVersion.ACON_APAR_ID}`

    return {
      role: 'licenceHolder',
      startDate,
      endDate,
      companyExternalId: partyExternalId,
      contactExternalId: licenceVersion.parties[0].APAR_TYPE === 'PER' ? partyExternalId : null,
      addressExternalId: `${permitData.FGAC_REGION_CODE}:${licenceVersion.ACON_AADD_ID}`
    }
  })
}

function _returnsToRoles (permitData) {
  const returnsToRoles = permitData.data.roles.filter((role) => {
    return role.role_detail.ALRT_CODE === 'RT'
  })

  return returnsToRoles.map((role) => {
    const partyId = `${permitData.FGAC_REGION_CODE}:${role.role_party.ID}`

    return {
      role: 'returnsTo',
      startDate: DateHelpers.mapNaldDate(role.role_detail.EFF_ST_DATE),
      endDate: DateHelpers.mapNaldDate(role.role_detail.EFF_END_DATE),
      companyExternalId: partyId,
      contactExternalId: role.role_party.APAR_TYPE === 'PER' ? partyId : null,
      addressExternalId: `${permitData.FGAC_REGION_CODE}:${role.role_address.ID}`
    }
  })
}

/**
 * Sorts the licence versions in ascending order of issue number and increment number.
 *
 * @private
 */
function _sortLicenceVersions (licenceVersions) {
  return licenceVersions.sort((licenceVersionA, licenceVersionB) => {
    const versionA = { issueNo: parseInt(licenceVersionA.ISSUE_NO), increment: parseInt(licenceVersionA.INCR_NO) }
    const versionB = { issueNo: parseInt(licenceVersionB.ISSUE_NO), increment: parseInt(licenceVersionB.INCR_NO) }

    if (versionA.issueNo > versionB.issueNo) {
      return 1
    }

    if (versionA.issueNo < versionB.issueNo) {
      return -1
    }

    if (versionA.increment > versionB.increment) {
      return 1
    }

    if (versionA.increment < versionB.increment) {
      return -1
    }

    return 0
  })
}

/**
 * There are 34 NALD licence records without a start date. For these we have to fall back to the versions against the
 * licence.
 *
 * @private
 */
function _startDate (permitData) {
  let startDate = DateHelpers.mapNaldDate(permitData.ORIG_EFF_DATE)

  if (startDate) {
    return startDate
  }

  startDate = DateHelpers.mapNaldDate(permitData.data.versions[0].EFF_ST_DATE)

  if (startDate) {
    return startDate
  }

  // NOTE: We don't expect to get here, but with NALD data you never know!
  throw Error(`Could not determine start date for licence: ${permitData.LIC_NO}`)
}

module.exports = {
  go
}
