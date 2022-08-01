'use strict'

const dateMapper = require('./date')

const statuses = {
  CURR: 'current',
  SUPER: 'superseded',
  DRAFT: 'draft'
}

const createExternalId = licenceVersionData => {
  const { FGAC_REGION_CODE, AABL_ID, ISSUE_NO, INCR_NO } = licenceVersionData
  return `${FGAC_REGION_CODE}:${AABL_ID}:${ISSUE_NO}:${INCR_NO}`
}

/**
 * Creates a mapped licence version object in a preferred format over
 * the NALD format including an array of any licence purposes.
 *
 * @param {Object} licenceVersionData THe NALD database row for the licence version
 * @param {Array<Object>} mappedPurposes An array of already mapped licence purposes
 * @param {Array<Object>} mappedConditions An array of conditions
 */
const mapLicenceVersion = (licenceVersionData, mappedPurposes = [], mappedConditions = []) => {
  const issue = +licenceVersionData.ISSUE_NO
  const increment = +licenceVersionData.INCR_NO
  return {
    issue,
    increment,
    status: statuses[licenceVersionData.STATUS],
    startDate: dateMapper.mapNaldDate(licenceVersionData.EFF_ST_DATE),
    endDate: dateMapper.mapNaldDate(licenceVersionData.EFF_END_DATE),
    externalId: createExternalId(licenceVersionData),
    purposes: mappedPurposes.filter(p => {
      return p.issue === issue && p.increment === increment
    }).map(p => {
      return { ...p, conditions: mappedConditions.filter(c => c.purposeExternalId === p.externalId) }
    })
  }
}

module.exports = {
  mapLicenceVersion
}
