'use strict';

const moment = require('moment');
const { flow, toUpper, first, range, get, pick } = require('lodash');

const DATE_FORMAT = 'YYYY-MM-DD';

const getFutureDate = (date, daysForward) => {
  return moment(date, DATE_FORMAT).add(daysForward, 'days').format(DATE_FORMAT);
};

const getNaldStyleDate = date => moment(date, DATE_FORMAT).format('YYYYMMDD000000');

/**
 * Takes a WRLS return object and converts to a smaller object ready
 * for loading into NALD
 */
const transformReturn = returnData => {
  const transformed = pick(returnData, 'returns_frequency', 'licence_ref', 'start_date', 'end_date', 'status', 'received_date');
  transformed.regionCode = get(returnData, 'metadata.nald.regionCode');
  transformed.formatId = get(returnData, 'metadata.nald.formatId');
  transformed.nald_date_from = getNaldStyleDate(transformed.start_date);
  transformed.nald_ret_date = getNaldStyleDate(transformed.received_date);
  return transformed;
};

const transformQuantity = (quantity = 0) => {
  if (quantity === null || toUpper(quantity) === 'NULL') {
    return null;
  }

  const val = quantity.toString();
  return val.includes('.') ? parseFloat(val).toFixed(3) : val;
};

const getUpperCasedFirstCharacter = flow(first, toUpper);

/**
 * Takes a WRLS line object and converts to a smaller object ready
 * for loading into NALD
 */
const transformLine = lineData => {
  if (lineData.time_period === 'week') {
    throw new Error('Please use transformWeeklyLine for weekly lines');
  }
  const paths = ['start_date', 'end_date', 'time_period', 'reading_type', 'unit', 'user_unit'];
  const line = pick(lineData, paths);
  line.quantity = transformQuantity(lineData.quantity);
  line.nald_reading_type = getUpperCasedFirstCharacter(line.reading_type);
  line.nald_time_period = getUpperCasedFirstCharacter(line.time_period);
  return line;
};

/**
 * Takes a weekly WRLS line object and converts to 7 daily lines
 * objects for loading into NALD where weekly data is represented
 * using 7 day lines.
 */
const transformWeeklyLine = lineData => {
  if (lineData.time_period !== 'week') {
    throw new Error('Please use transformLine when not weekly');
  }

  const dailies = range(7).reduce((lines, daysForward) => {
    const date = getFutureDate(lineData.start_date, daysForward);
    const quantity = daysForward === 6 ? lineData.quantity : 0;

    const dailyLine = transformLine(Object.assign({}, lineData, {
      start_date: date,
      end_date: date,
      quantity,
      time_period: 'day'
    }));
    return [...lines, dailyLine];
  }, []);

  return dailies;
};

module.exports = {
  transformReturn,
  transformLine,
  transformWeeklyLine,
  transformQuantity
};
