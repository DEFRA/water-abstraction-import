'use strict'

const moment = require('moment')

const DATE_FORMAT = 'YYYY-MM-DD'
const NALD_FORMAT = 'DD/MM/YYYY'

/**
 * Compares two dates and returns:
 *
 * -1 if dateA is before dateB
 * 1 if dateA is after dateB
 * 0 if they are the same date
 *
 * This is useful as a helper for sorting dates.
 *
 * @param {Date} dateA - First date to compare
 * @param {Date} dateB - Second date to compare
 *
 * @returns {number} -1 if dateA is before dateB, 1 if dateA is after dateB, 0 if they are the same date
 */
function compareDates (dateA, dateB) {
  // Math.sign() clamps the result of the subtraction to a minimum of -1 and a maximum of 1
  return Math.sign(dateA - dateB)
}

/**
 * Gets the end date for a company address from licence version data
 * @param {Object} row - from NALD licence/licence version data
 * @param {String,Null} currentEnd - the current value of the end date in the accumulator
 */
function getEndDate (row, currentEnd) {
  // Get all end dates for this row
  const endDates = [row?.EFF_END_DATE, row?.EXPIRY_DATE, row?.REV_DATE, row?.LAPSED_DATE]
    .map(mapNaldDate)
    .filter(value => value)

  const arr = [getMinDate(endDates), currentEnd]

  return arr.includes(null) ? null : getMaxDate(arr)
}

function getMinDate (values, mapFromNald = false) {
  let mappedValues = values

  if (mapFromNald) {
    mappedValues = values.map((value) => {
      return mapNaldDate(value)
    })
  }

  const sortedDates = _sortDates(mappedValues)

  if (sortedDates.length === 0) {
    return null
  }

  return sortedDates[0]
}

function getMaxDate (values, mapFromNald = false) {
  let mappedValues = values

  if (mapFromNald) {
    mappedValues = values.map((value) => {
      return mapNaldDate(value)
    })
  }

  const sortedDates = _sortDates(mappedValues)

  if (sortedDates.length === 0) {
    return null
  }

  return sortedDates[sortedDates.length - 1]
}

function mapNaldDate (value) {
  if (!value || value === 'null') {
    return null
  }

  return moment(value, NALD_FORMAT).format(DATE_FORMAT)
}

/**
 * Given an array of dates which can be parsed by Moment, filters out falsey values and returns a list of moment objects
 * sorted in ascending date order
 *
 * @private
 */
function _sortDates (arr) {
  const filteredArray = arr.filter((value) => {
    return value
  })
  const mappedArray = filteredArray.map((value) => {
    return moment(value)
  })

  mappedArray.sort(function (startDate1, startDate2) {
    if ((startDate1.unix() > startDate2.unix())) {
      return 1
    } else {
      return -1
    }
  })

  return mappedArray
}

module.exports = {
  compareDates,
  getEndDate,
  getMinDate,
  getMaxDate,
  mapNaldDate
}
