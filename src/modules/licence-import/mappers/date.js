const moment = require('moment');
const DATE_FORMAT = 'YYYY-MM-DD';
const NALD_FORMAT = 'DD/MM/YYYY';

const mapNaldDate = str => {
  if (str === 'null') {
    return null;
  }
  return moment(str, NALD_FORMAT).format(DATE_FORMAT);
};

const getSortedDates = arr => {
  const moments = arr
    .map(str => moment(str, DATE_FORMAT))
    .filter(m => m.isValid());

  return moments.sort(m => m.unix());
};

const getMinDate = arr => {
  const sorted = getSortedDates(arr);
  return sorted.length === 0 ? null : sorted.shift().format(DATE_FORMAT);
};

const getMaxDate = arr => {
  const sorted = getSortedDates(arr);
  return sorted.length === 0 ? null : sorted.pop().format(DATE_FORMAT);
};

exports.mapNaldDate = mapNaldDate;
exports.getMinDate = getMinDate;
exports.getMaxDate = getMaxDate;
