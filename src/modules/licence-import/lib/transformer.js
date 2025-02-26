'use strict'

const DateHelpers = require('../../../lib/date-helpers.js')

const REGIONS = {
  AN: 'Anglian',
  MD: 'Midlands',
  NO: 'Northumbria',
  NW: 'North West',
  SO: 'Southern',
  SW: 'South West (incl Wessex)',
  TH: 'Thames',
  WL: 'Wales',
  YO: 'Yorkshire'
}

const STATUSES = {
  CURR: 'current',
  SUPER: 'superseded',
  DRAFT: 'draft'
}

function go (permitData) {
  const licence = _licence(permitData)
  const licenceVersions = _licenceVersions(permitData)

  return { licence, licenceVersions }
}

function _licence (permitData) {
  const startDate = _startDate(permitData)
  const endDate = DateHelpers.getEndDate(permitData)

  return {
    licenceNumber: permitData.LIC_NO,
    startDate,
    endDate,
    externalId: `${permitData.FGAC_REGION_CODE}:${permitData.ID}`,
    isWaterUndertaker: permitData.AREP_EIUC_CODE.endsWith('SWC'),
    regions: _regions(permitData),
    regionCode: parseInt(permitData.FGAC_REGION_CODE, 10),
    expiredDate: DateHelpers.mapNaldDate(permitData.EXPIRY_DATE),
    lapsedDate: DateHelpers.mapNaldDate(permitData.LAPSED_DATE),
    revokedDate: DateHelpers.mapNaldDate(permitData.REV_DATE)
  }
}

function _licenceVersions (permitData) {
  return permitData.data.versions.map((version) => {
    const { FGAC_REGION_CODE, AABL_ID, EFF_END_DATE, EFF_ST_DATE, ISSUE_NO, INCR_NO, STATUS } = version

    // NOTE: For those that haven't seen it before + before a variable is known as Unary plus
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Unary_plus
    //
    // In this context it is being used to convert the value to a number. We've left it as found because the docs state
    //
    // > unary plus is the fastest and preferred way of converting something into a number, because it does not perform
    // > any other operations on the number.
    return {
      issue: +ISSUE_NO,
      increment: +INCR_NO,
      status: STATUSES[STATUS],
      startDate: DateHelpers.mapNaldDate(EFF_ST_DATE),
      endDate: DateHelpers.mapNaldDate(EFF_END_DATE),
      externalId: `${FGAC_REGION_CODE}:${AABL_ID}:${ISSUE_NO}:${INCR_NO}`
    }
  })
}

function _regions (permitData) {
  const regionPrefix = permitData.AREP_EIUC_CODE.substr(0, 2)

  return {
    historicalAreaCode: permitData.AREP_AREA_CODE,
    regionalChargeArea: REGIONS[regionPrefix],
    standardUnitChargeCode: permitData.AREP_SUC_CODE,
    localEnvironmentAgencyPlanCode: permitData.AREP_LEAP_CODE
  }
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
