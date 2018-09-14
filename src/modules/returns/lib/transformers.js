'use strict';

const moment = require('moment');
const { range, get, pick } = require('lodash');

const DATE_FORMAT = 'YYYY-MM-DD';

const getFutureDate = (date, daysForward) => {
  return moment(date, DATE_FORMAT).add(daysForward, 'days').format(DATE_FORMAT);
};

/**
 * Takes a WRLS return object and converts to a smaller object ready
 * for loading into NALD
 */
const transformReturn = returnData => {
  const transformed = pick(returnData, 'returns_frequency', 'licence_ref', 'start_date', 'end_date', 'status');
  transformed.regionCode = get(returnData, 'metadata.nald.regionCode');
  transformed.formatId = get(returnData, 'metadata.nald.formatId');
  return transformed;
};

/**
 * Takes a WRLS line object and converts to a smaller object ready
 * for loading into NALD
 */
const transformLine = lineData => {
  if (lineData.time_period === 'week') {
    throw new Error('Please use transformWeeklyLine for weekly lines');
  }
  const paths = ['quantity', 'start_date', 'end_date', 'time_period', 'reading_type', 'unit'];
  return pick(lineData, paths);
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
  transformWeeklyLine
};
