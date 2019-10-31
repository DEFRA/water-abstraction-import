const date = require('./date');
const str = require('./str');
const { identity, omit, isArray, isObject, mapValues, cloneDeep } = require('lodash');

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
