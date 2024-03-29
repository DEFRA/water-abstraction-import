'use strict'

const date = require('./date')
const str = require('./str')

const regions = {
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

const getRegionData = licenceData => {
  const historicalAreaCode = licenceData.AREP_AREA_CODE
  const regionPrefix = licenceData.AREP_EIUC_CODE.substr(0, 2)
  const regionalChargeArea = regions[regionPrefix]
  const standardUnitChargeCode = licenceData.AREP_SUC_CODE
  const localEnvironmentAgencyPlanCode = licenceData.AREP_LEAP_CODE
  return { historicalAreaCode, regionalChargeArea, standardUnitChargeCode, localEnvironmentAgencyPlanCode }
}

const isNotDraftLicenceVersion = licenceVersion => licenceVersion.STATUS !== 'DRAFT'

const getLicenceVersionStartDate = licenceVersion => date.mapNaldDate(licenceVersion.EFF_ST_DATE)

/**
 * Maps the licence and licence versions to a start date.
 * If the licence ORIG_EFF_DATE is not null, this is used.
 * Otherwise the start date of the earliest non-draft licence
 * version is used.
 *
 * @param {Object} licence
 * @param {Object} licenceVersions
 * @return {String} YYYY-MM-DD
 */
const mapStartDate = (licence, licenceVersions) => {
  if (licence.ORIG_EFF_DATE !== 'null') {
    return date.mapNaldDate(licence.ORIG_EFF_DATE)
  }

  return licenceVersions
    .filter(isNotDraftLicenceVersion)
    .map(getLicenceVersionStartDate)
    .sort()
    .shift()
}

const mapLicence = (licence, licenceVersions) => {
  const endDates = [
    licence.EXPIRY_DATE,
    licence.REV_DATE,
    licence.LAPSED_DATE
  ]
    .map(str.mapNull)
    .filter(value => value)
    .map(date.mapNaldDate)

  return {
    licenceNumber: licence.LIC_NO,
    startDate: mapStartDate(licence, licenceVersions),
    endDate: date.getMinDate(endDates),
    documents: [],
    agreements: [],
    externalId: `${licence.FGAC_REGION_CODE}:${licence.ID}`,
    isWaterUndertaker: licence.AREP_EIUC_CODE.endsWith('SWC'),
    regions: getRegionData(licence),
    regionCode: parseInt(licence.FGAC_REGION_CODE, 10),
    expiredDate: date.mapNaldDate(licence.EXPIRY_DATE),
    lapsedDate: date.mapNaldDate(licence.LAPSED_DATE),
    revokedDate: date.mapNaldDate(licence.REV_DATE),
    _nald: licence
  }
}

/**
 * Deep cleans up any _nald keys in a deep object
 * @param {Object}
 * @return {Object}
 */
const omitNaldData = value => {
  if (Array.isArray(value)) {
    return value.map(omitNaldData)
  }
  if (typeof value === 'object' && value !== null) {
    const val = { ...value }
    delete val._nald
    const mappedVal = {}
    for (const key in val) {
      mappedVal[key] = omitNaldData(val[key])
    }
    return mappedVal
  }
  return value
}

module.exports = {
  mapLicence,
  omitNaldData
}
