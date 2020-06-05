'use strict';

const moment = require('moment');
const { pick, findIndex, max, chunk } = require('lodash');

const waterHelpers = require('@envage/water-abstraction-helpers');

const { returns: { date: { getPeriodStart } } } = waterHelpers;
const naldFormatting = waterHelpers.nald.formatting;

const mapPeriod = (str) => {
  const periods = {
    D: 'day',
    W: 'week',
    M: 'month',
    Q: 'quarter',
    A: 'year'
  };
  return periods[str];
};

/**
 * Gets additional NALD data to store in return metadata
 * @param {Object} format - the return format record from NALD data
 * @return {Object} metadata to store
 */
const formatReturnNaldMetadata = (format) => {
  return {
    regionCode: parseInt(format.FGAC_REGION_CODE),
    areaCode: format.AREP_AREA_CODE,
    formatId: parseInt(format.ID),
    periodStartDay: format.ABS_PERIOD_ST_DAY,
    periodStartMonth: format.ABS_PERIOD_ST_MONTH,
    periodEndDay: format.ABS_PERIOD_END_DAY,
    periodEndMonth: format.ABS_PERIOD_END_MONTH
  };
};

/**
 * Returns the trimmed purpose alias if it is not
 * already empty or equal to 'null'
 */
const getPurposeAlias = purpose => {
  const alias = (purpose.PURP_ALIAS || '').trim();

  if (!['', 'null'].includes(alias.toLowerCase())) {
    return alias;
  }
};

/**
 * Gets metadata object to store in returns table
 * @param {Object} format
 * @return {Object} return metadata
 */
const formatReturnMetadata = (format) => {
  const { isSummer, isUpload, isLineEntry } = mapProductionMonth(format.FORM_PRODN_MONTH);

  return {
    version: 1,
    description: format.SITE_DESCR,
    purposes: format.purposes.map(purpose => ({
      primary: {
        code: purpose.APUR_APPR_CODE,
        description: purpose.primary_purpose
      },
      secondary: {
        code: purpose.APUR_APSE_CODE,
        description: purpose.secondary_purpose
      },
      tertiary: {
        code: purpose.APUR_APUS_CODE,
        description: purpose.tertiary_purpose
      },
      alias: getPurposeAlias(purpose)
    })),
    points: format.points.map(point => {
      return naldFormatting.formatAbstractionPoint(waterHelpers.nald.transformNull(point));
    }),
    nald: formatReturnNaldMetadata(format),
    isTwoPartTariff: format.TPT_FLAG === 'Y',
    isSummer,
    isUpload: isUpload || isLineEntry
  };
};

/**
 * Maps NALD production month
 * @param {Number} month
 * @return {Object}
 */
const mapProductionMonth = (month) => {
  const intMonth = parseInt(month);
  return {
    isSummer: [65, 45, 80].includes(intMonth),
    isUpload: [65, 66].includes(intMonth),
    isLineEntry: [45, 46].includes(intMonth),
    formProduced: [80, 70].includes(intMonth)
  };
};

/**
 * A return may comprise more than one form log
 * If any form log has not been received, we return null
 * If there are no form log, return null
 * otherwise return max received last date
 * @param {Array} logs - form log records
 */
const mapReceivedDate = (logs) => {
  const dates = logs.map(row => row.RECD_DATE);

  if (logs.length < 1) {
    return null;
  }

  if (findIndex(dates, val => val === 'null') !== -1) {
    return null;
  }

  const timestamps = dates.map(date => moment(date, 'DD/MM/YYYY HH:mm:ss').format('YYYY-MM-DD'));

  return max(timestamps);
};

/**
 * Split dates are the start date of the period.  This function
 * adds the period end dates to the array
 * @param {Array} arr - the array of split dates
 * @return {Array} an array containing the split dates and previous day
 */
const sortAndPairSplitDates = (arr) => {
  const sorted = arr.map(val => moment(val).format('YYYY-MM-DD')).sort();

  return sorted.reduce((acc, value) => {
    acc.push(moment(value).subtract(1, 'day').format('YYYY-MM-DD'));
    acc.push(value);
    return acc;
  }, []);
};

/**
 * Adds a date to the supplied array, if it is between but not equal to the
 * supplied start and end dates
 * @param {Array} dates
 * @param {String} date - YYYY-MM-DD, the date to add to array
 * @param {String} startDate - the start of the date range YYYY-MM-DD
 * @param {String} endDate - the end of the date range YYYY-MM-DD
 * @return {Array} new date array
 */
const addDate = (dates, date, startDate, endDate) => {
  const m = moment(date);
  const dateStr = m.format('YYYY-MM-DD');
  const arr = dates.slice();
  const isValid = m.isBetween(startDate, endDate, 'day', '()');
  const isUnique = !arr.includes(dateStr);
  if (isValid && isUnique) {
    arr.push(dateStr);
  }
  return arr;
};

/**
 * Gets summer/financial year return cycles, including splitting the cycles
 * by licence effective start date (split date)
 * @param {String} startDate - YYYY-MM-DD
 * @param {String} endDate - YYYY-MM-DD
 * @param {String} splitDate - licence effective start date
 * @param {Boolean} isSummer - whether summer return cycle (default financial year)
 * @return {Array} of return cycle objects
 */
const getReturnCycles = (startDate, endDate, splitDate, isSummer = false) => {
  let splits = [];

  // Add split date
  if (splitDate) {
    splits = addDate(splits, splitDate, startDate, endDate);
  }

  // Date pointer should be within summer/financial year
  let datePtr = moment().year();
  do {
    datePtr = getPeriodStart(datePtr, isSummer);
    splits = addDate(splits, datePtr, startDate, endDate);
    datePtr = moment(datePtr).add(1, 'year');
  }
  while (moment(datePtr).isBefore(endDate));

  const dates = chunk([startDate, ...sortAndPairSplitDates(splits), endDate], 2);

  return dates.map(arr => ({
    startDate: arr[0],
    endDate: arr[1],
    isCurrent: (splitDate === null) || moment(arr[0]).isSameOrAfter(splitDate)
  }));
};

/**
 * Given format/return version data, gets the start and end dates of
 * this format
 * @param {Object} format
 * @return {String} date YYYY-MM-DD
 */
const getFormatStartDate = (format) => {
  const versionStartDate = moment(format.EFF_ST_DATE, 'DD/MM/YYYY');
  const timeLimitedStartDate = moment(format.TIMELTD_ST_DATE, 'DD/MM/YYYY');

  if (timeLimitedStartDate.isValid() && timeLimitedStartDate.isAfter(versionStartDate)) {
    return timeLimitedStartDate.format('YYYY-MM-DD');
  }
  return versionStartDate.format('YYYY-MM-DD');
};

/**
 * Finds the earlist valid date that represents the end date of
 * the given format.
 *
 * Returns null, if no format end date.
 * @param {Object} format
 * @return {String} date YYYY-MM-DD or null
 */
const getFormatEndDate = (format) => {
  const dates = Object.values(pick(format, [
    'EFF_END_DATE',
    'TIMELTD_END_DATE',
    'LICENCE_LAPSED_DATE',
    'LICENCE_REVOKED_DATE',
    'LICENCE_EXPIRY_DATE'
  ]));

  const validDates = dates
    .map(date => moment(date, 'DD/MM/YYYY'))
    .filter(date => date.isValid())
    .sort(chronologicalMomentSort)
    .map(date => date.format('YYYY-MM-DD'));

  return validDates.length ? validDates[0] : null;
};

/**
 * A sort camparator that will sort moment dates in ascending order
 */
const chronologicalMomentSort = (left, right) => left.diff(right);

/**
 * Gets cycles for a given format.  If the format has no effective end date,
 * then one is created at the end of the following year.  These will be filtered
 * out later by checking if form logs exist for the cycles calculated
 * @param {Object} row of data from NALD_RET_FORMATS
 * @return {Array} array of return cycles with startDate and endDate in each item
 */
const getFormatCycles = (format, splitDate) => {
  const {
    FORM_PRODN_MONTH: productionMonth
  } = format;

  // Get summer cycle flag
  const { isSummer } = mapProductionMonth(productionMonth);

  // Get start/end date for format, taking into account version dates and
  // time-limited dates
  const startDate = getFormatStartDate(format);
  let endDate = getFormatEndDate(format);

  // If no end date, set date in future
  if (!endDate) {
    endDate = moment(getPeriodStart(moment().add(1, 'years'), isSummer)).subtract(1, 'day').format('YYYY-MM-DD');
  }

  return getReturnCycles(startDate, endDate, splitDate, isSummer);
};

/**
 * Gets return status
 * @param {String|null} receivedDate - the date received from NALD form logs YYYY-MM-DD, or null
 * @param {String} startDate - the start date of the return period
 * @return {String} status - completed|due
 */
const getStatus = receivedDate => receivedDate === null ? 'due' : 'completed';

exports.mapPeriod = mapPeriod;
exports.mapProductionMonth = mapProductionMonth;
exports.formatReturnMetadata = formatReturnMetadata;
exports.getFormatCycles = getFormatCycles;
exports.mapReceivedDate = mapReceivedDate;
exports.getReturnCycles = getReturnCycles;
exports.addDate = addDate;
exports.getStatus = getStatus;
exports.getFormatStartDate = getFormatStartDate;
exports.getFormatEndDate = getFormatEndDate;
