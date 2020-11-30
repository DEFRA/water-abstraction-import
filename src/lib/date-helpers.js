'use strict';

const moment = require('moment');
const { sortBy, first, last, identity } = require('lodash');

/**
 * Given an array of dates which can be parsed by Moment,
 * filters out falsey values and returns a list of moment objects
 * sorted in ascending date order
 * @param {Array<String>} arr
 * @return {Array<Object>}
 */
const getSortedDates = arr => sortBy(
  arr
    .filter(identity)
    .map(value => moment(value)),
  m => m.unix()
);

const getMinDate = arr => first(getSortedDates(arr));
const getMaxDate = arr => last(getSortedDates(arr));

exports.getMinDate = getMinDate;
exports.getMaxDate = getMaxDate;
