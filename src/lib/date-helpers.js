'use strict'

const moment = require('moment')

/**
 * Given an array of dates which can be parsed by Moment,
 * filters out falsey values and returns a list of moment objects
 * sorted in ascending date order
 * @param {Array<String>} arr
 * @return {Array<Object>}
 */
const getSortedDates = arr => {
  const filteredArray = arr.filter(value => value)
  const mappedArray = filteredArray.map(value => moment(value))
  mappedArray.sort(function (startDate1, startDate2) {
    if ((startDate1.unix > startDate2.unix)) {
      return -1
    } else {
      return 1
    }
  })
  return mappedArray
}

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
