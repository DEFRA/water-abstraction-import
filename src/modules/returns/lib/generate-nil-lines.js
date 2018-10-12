const moment = require('moment');
const { pick, mapValues } = require('lodash');

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
  const datePtr = moment(startDate);
  const lines = [];
  datePtr.startOf('week');
  do {
    lines.push({
      startDate: datePtr.startOf('week').format('YYYY-MM-DD'),
      endDate: datePtr.endOf('week').format('YYYY-MM-DD'),
      timePeriod: 'week'
    });
    datePtr.add(1, 'week');
  }
  while (datePtr.isSameOrBefore(endDate, 'month'));

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

const mapLine = (line, returnData, absPeriod) => {
  const { startDate, endDate } = line;

  const isInPeriod = isDateWithinAbstractionPeriod(startDate, absPeriod) || isDateWithinAbstractionPeriod(endDate, absPeriod);

  return {
    start_date: startDate,
    end_date: endDate,
    quantity: isInPeriod ? 0 : null,
    units: 'm³',
    user_unit: 'm³',
    reading_type: 'measured',
    time_period: returnData.returns_frequency
  };
};

const generateNilLines = (returnData, version) => {
  const { start_date: startDate, end_date: endDate, returns_frequency: frequency } = returnData;

  const absPeriod = getAbsPeriod(returnData);

  const lines = getRequiredLines(startDate, endDate, frequency);

  console.log(version);
  // console.log(lines);

  return lines.map(line => mapLine(line, returnData, absPeriod));
};

module.exports = {
  generateNilLines
};
