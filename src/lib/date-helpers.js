'use strict'

const moment = require('moment')
const { sortBy, identity } = require('lodash')

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
)

const getMinDate = arr => {
  return getSortedDates(arr)[0]
}
const getMaxDate = arr => {
  const sorted = getSortedDates(arr)
  return sorted[sorted.length - 1]
}

module.exports = {
  getMinDate,
  getMaxDate
}
