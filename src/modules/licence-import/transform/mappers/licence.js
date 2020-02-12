const date = require('./date');
const str = require('./str');
const {
  endsWith,
  identity,
  omit,
  isArray,
  isObject,
  mapValues
} = require('lodash');

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
};

const getRegionData = licenceData => {
  const historicalAreaCode = licenceData.AREP_AREA_CODE;
  const regionPrefix = licenceData.AREP_EIUC_CODE.substr(0, 2);
  const regionalChargeArea = regions[regionPrefix];
  return { historicalAreaCode, regionalChargeArea };
};

const mapLicence = data => {
  const endDates = [
    data.EXPIRY_DATE,
    data.REV_DATE,
    data.LAPSED_DATE
  ]
    .map(str.mapNull)
    .filter(identity)
    .map(date.mapNaldDate);

  return {
    licenceNumber: data.LIC_NO,
    startDate: date.mapNaldDate(data.ORIG_EFF_DATE),
    endDate: date.getMinDate(endDates),
    documents: [],
    agreements: [],
    externalId: `${data.FGAC_REGION_CODE}:${data.ID}`,
    isWaterUndertaker: endsWith(data.AREP_EIUC_CODE, 'SWC'),
    regions: getRegionData(data),
    regionCode: parseInt(data.FGAC_REGION_CODE, 10),
    expiredDate: date.mapNaldDate(data.EXPIRY_DATE),
    lapsedDate: date.mapNaldDate(data.LAPSED_DATE),
    revokedDate: date.mapNaldDate(data.REV_DATE),
    _nald: data
  };
};

/**
 * Deep cleans up any _nald keys in a deep object
 * @param {Object}
 * @return {Object}
 */
const omitNaldData = value => {
  if (isArray(value)) {
    return value.map(omitNaldData);
  }
  if (isObject(value)) {
    const val = omit(value, '_nald');
    return mapValues(val, omitNaldData);
  }
  return value;
};

exports.mapLicence = mapLicence;
exports.omitNaldData = omitNaldData;
