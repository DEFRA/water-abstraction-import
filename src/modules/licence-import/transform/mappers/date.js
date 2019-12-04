const moment = require('moment');
const { sortBy } = require('lodash');
const DATE_FORMAT = 'YYYY-MM-DD';
const NALD_FORMAT = 'DD/MM/YYYY';
const NALD_TRANSFER_FORMAT = 'DD/MM/YYYY HH:mm:ss';

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

  return sortBy(moments, m => m.unix());
};

const getMinDate = arr => {
  const sorted = getSortedDates(arr);
  return sorted.length === 0 ? null : sorted.shift().format(DATE_FORMAT);
};

const getMaxDate = arr => {
  const sorted = getSortedDates(arr);
  return sorted.length === 0 ? null : sorted.pop().format(DATE_FORMAT);
};

const mapTransferDate = str =>
  moment(str, NALD_TRANSFER_FORMAT).format(DATE_FORMAT);

const getPreviousDay = str =>
  moment(str, DATE_FORMAT).subtract(1, 'day').format(DATE_FORMAT);

exports.mapNaldDate = mapNaldDate;
exports.getMinDate = getMinDate;
exports.getMaxDate = getMaxDate;
exports.mapTransferDate = mapTransferDate;
exports.getPreviousDay = getPreviousDay;
