'use strict'

const moment = require('moment')

const DATE_FORMAT = 'YYYY-MM-DD'
const NALD_FORMAT = 'DD/MM/YYYY'
const NALD_TRANSFER_FORMAT = 'DD/MM/YYYY HH:mm:ss'

/**
 * Gets the end date for a company address from licence version data
 * @param {Object} row - from NALD licence/licence version data
 * @param {String,Null} currentEnd - the current value of the end date in the accumulator
 */
function getEndDate (row, currentEnd) {
  // Get all end dates for this row
  const endDates = [row.EFF_END_DATE, row.EXPIRY_DATE, row.REV_DATE, row.LAPSED_DATE]
    .map(mapNaldDate)
    .filter(value => value)

  const arr = [getMinDate(endDates), currentEnd]

  return arr.includes(null) ? null : getMaxDate(arr)
}

function getMaxDate (values) {
  const sorted = _sortDates(values)

  return sorted.length === 0 ? null : sorted[sorted.length - 1].format(DATE_FORMAT)
}

function getMinDate (values) {
  const sorted = _sortDates(values)

  return sorted.length === 0 ? null : sorted[0].format(DATE_FORMAT)
}

function getPreviousDay (value) {
  return moment(value, DATE_FORMAT).subtract(1, 'day').format(DATE_FORMAT)
}

function mapIsoDateToNald (value) {
  if (value === null) {
    return 'null'
  }

  return moment(value, DATE_FORMAT).format(NALD_FORMAT)
}

function mapNaldDate (value) {
  if (value === 'null') {
    return null
  }

  return moment(value, NALD_FORMAT).format(DATE_FORMAT)
}

function mapTransferDate (value) {
  return moment(value, NALD_TRANSFER_FORMAT).format(DATE_FORMAT)
}

function _sortDates (arr) {
  const moments = arr
    .map(value => moment(value, DATE_FORMAT))
    .filter(m => m.isValid())

  const sorted = moments.sort(function (startDate1, startDate2) {
    return startDate1 - startDate2
  })

  return sorted
}

module.exports = {
  getEndDate,
  getMinDate,
  getMaxDate,
  getPreviousDay,
  mapIsoDateToNald,
  mapNaldDate,
  mapTransferDate
}
