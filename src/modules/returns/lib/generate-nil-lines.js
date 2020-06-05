'use strict';

const moment = require('moment');
const { pick, mapValues } = require('lodash');

const waterHelpers = require('@envage/water-abstraction-helpers');
const naldDates = waterHelpers.nald.dates;

/**
 * Get required daily return lines
 * @param {String} startDate - YYYY-MM-DD start date of return cycle
 * @param {String} endDate - YYYY-MM-DD end date of return cycle
 * @return {Array} list of required return lines
 */
const getDays = (startDate, endDate) => {
  const datePtr = moment(startDate);
  const lines = [];
  do {
    lines.push({
      startDate: datePtr.format('YYYY-MM-DD'),
      endDate: datePtr.format('YYYY-MM-DD'),
      timePeriod: 'day'
    });
    datePtr.add(1, 'day');
  }
  while (datePtr.isSameOrBefore(endDate, 'day'));

  return lines;
};

/**
 * Get required monthly return lines
 * @param {String} startDate - YYYY-MM-DD start date of return cycle
 * @param {String} endDate - YYYY-MM-DD end date of return cycle
 * @return {Array} list of required return lines
 */
const getMonths = (startDate, endDate) => {
  const datePtr = moment(startDate);
  const lines = [];
  do {
    lines.push({
      startDate: datePtr.startOf('month').format('YYYY-MM-DD'),
      endDate: datePtr.endOf('month').format('YYYY-MM-DD'),
      timePeriod: 'month'
    });
    datePtr.add(1, 'month');
  }
  while (datePtr.isSameOrBefore(endDate, 'month'));
  return lines;
};

/**
 * Get required annual return lines
 * @param {String} startDate - YYYY-MM-DD start date of return cycle
 * @param {String} endDate - YYYY-MM-DD end date of return cycle
 * @return {Array} list of required return lines
 */
const getYears = (startDate, endDate) => {
  return [{
    startDate,
    endDate,
    timePeriod: 'year'
  }];
};

/**
 * Get required weekly return lines
 * @param {String} startDate - YYYY-MM-DD start date of return cycle
 * @param {String} endDate - YYYY-MM-DD end date of return cycle
 * @return {Array} list of required return lines
 */
const getWeeks = (startDate, endDate) => {
  let datePtr = naldDates.getWeek(startDate);
  const lines = [];

  do {
    lines.push({
      startDate: datePtr.start.format('YYYY-MM-DD'),
      endDate: datePtr.end.format('YYYY-MM-DD'),
      timePeriod: 'week'
    });
    datePtr = naldDates.getWeek(datePtr.start.add(1, 'week'));
  }
  while (datePtr.end.isSameOrBefore(endDate, 'day'));

  return lines;
};

/**
 * Calculates lines required in return
 * @param {String} startDate - YYYY-MM-DD
 * @param {String} endDate - YYYY-MM-DD
 * @param {String} frequency
 * @return {Array} array of required lines
 */
const getRequiredLines = (startDate, endDate, frequency) => {
  switch (frequency) {
    case 'day':
      return getDays(startDate, endDate);

    case 'week':
      return getWeeks(startDate, endDate);

    case 'month':
      return getMonths(startDate, endDate);

    case 'year':
      return getYears(startDate, endDate);

    default:
      throw new Error(`Unknown frequency ${frequency}`);
  }
};

/**
 * Checks whether a supplied day/month is the same or after a reference day/month
 * @param {Number} day - the day to test
 * @param {Number} month - the month to test
 * @param {Number} refDay - the reference day
 * @param {Number} refMonth - the reference month
 * @return {Boolean}
 */
const isSameOrAfter = (day, month, refDay, refMonth) => {
  if (month > refMonth) {
    return true;
  }
  return ((month === refMonth) && (day >= refDay));
};

/**
 * Checks whether a supplied day/month is the same or before a reference day/month
 * @param {Number} day - the day to test
 * @param {Number} month - the month to test
 * @param {Number} refDay - the reference day
 * @param {Number} refMonth - the reference month
 * @return {Boolean}
 */
const isSameOrBefore = (day, month, refDay, refMonth) => {
  if (month < refMonth) {
    return true;
  }
  return (month === refMonth) && (day <= refDay);
};

/**
 * Checks whether the specified date is within the abstraction period
 * @param {String} date - the date to test, format YYYY-MM-DD
 * @param {Object} options - abstraction period
 * @param {Number} options.periodStartDay - abstraction period start day of the month
 * @param {Number} options.periodStartMonth - abstraction period start month
 * @param {Number} options.periodEndDay - abstraction period end day of the month
 * @param {Number} options.periodEndMonth - abstraction period end month
 * @return {Boolean} whether supplied date is within abstraction period
 */
const isDateWithinAbstractionPeriod = (date, options) => {
  const {
    periodEndDay,
    periodEndMonth,
    periodStartDay,
    periodStartMonth
  } = options;

  // Month and day of test date
  const month = moment(date).month() + 1;
  const day = moment(date).date();

  // Period start date is >= period end date
  if (isSameOrAfter(periodEndDay, periodEndMonth, periodStartDay, periodStartMonth)) {
    return isSameOrAfter(day, month, periodStartDay, periodStartMonth) &&
      isSameOrBefore(day, month, periodEndDay, periodEndMonth);
  } else {
    const prevYear = isSameOrAfter(day, month, 1, 1) &&
     isSameOrBefore(day, month, periodEndDay, periodEndMonth);

    const thisYear = isSameOrAfter(day, month, periodStartDay, periodStartMonth) &&
     isSameOrBefore(day, month, 31, 12);

    return prevYear || thisYear;
  }
};

const getAbsPeriod = (returnData) => {
  const data = pick(returnData.metadata.nald, ['periodStartDay', 'periodStartMonth', 'periodEndDay', 'periodEndMonth']);
  return mapValues(data, parseInt);
};

/**
 * Accepts a line generated by the getRequiredLines call, and returns a line
 * similar to that returned by the returns service
 * @param {Object} line
 * @param {Object} absPeriod
 * @param {String} period - return frequency week|month|day
 * @return {Object} mapped line
 */
const mapLine = (line, absPeriod) => {
  const { startDate, endDate, timePeriod } = line;

  const isInPeriod = isDateWithinAbstractionPeriod(endDate, absPeriod);

  return {
    start_date: startDate,
    end_date: endDate,
    quantity: isInPeriod ? 0 : null,
    units: 'm³',
    user_unit: 'm³',
    reading_type: 'measured',
    time_period: timePeriod
  };
};

/**
 * Given return data for a nil return, generates a list of return
 * lines with 0 in lines overlapping the authorised abstraction period,
 * and null elsewhere
 * @param {Object} returnData - return row from return service
 * @return {Array} return lines
 */
const generateNilLines = (returnData) => {
  const { start_date: startDate, end_date: endDate, returns_frequency: frequency } = returnData;

  const absPeriod = getAbsPeriod(returnData);

  const lines = getRequiredLines(startDate, endDate, frequency);

  return lines.map(line => mapLine(line, absPeriod));
};

exports.getDays = getDays;
exports.getMonths = getMonths;
exports.getWeeks = getWeeks;
exports.getRequiredLines = getRequiredLines;
exports.generateNilLines = generateNilLines;
exports.isDateWithinAbstractionPeriod = isDateWithinAbstractionPeriod;
exports.getAbsPeriod = getAbsPeriod;
exports.mapLine = mapLine;
