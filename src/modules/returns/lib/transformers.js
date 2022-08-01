'use strict'

const moment = require('moment')
const { returns: { date: { getPeriodStart } } } = require('@envage/water-abstraction-helpers')
const { flow, toUpper, first, range, get, pick } = require('lodash')
const { isDateWithinReturnCycle } = require('./date-helpers')

const DATE_FORMAT = 'YYYY-MM-DD'

const getFutureDate = (date, daysForward) => {
  return moment(date, DATE_FORMAT).add(daysForward, 'days').format(DATE_FORMAT)
}

const getNaldStyleDate = date => moment(date, DATE_FORMAT).format('YYYYMMDD000000')

/**
 * Given return data from the return service, calculates the return cycle
 * start date for the return.
 * Relies on metadata.isSummer being defined
 * @param  {Object} returnData - row of data from returns service
 * @return {String}            - date in format 'YYYY-MM-DD'
 */
const getReturnCycleStart = (returnData) => {
  const isSummer = get(returnData, 'metadata.isSummer', undefined)
  if (typeof isSummer !== 'undefined') {
    return getPeriodStart(returnData.start_date, isSummer)
  }
}

/**
 * Takes a WRLS return object and converts to a smaller object ready
 * for loading into NALD
 */
const transformReturn = (returnData, addFields = []) => {
  const pickFields = ['returns_frequency', 'licence_ref', 'start_date', 'end_date', 'status', 'received_date', 'under_query', 'under_query_comment', ...addFields]
  const transformed = pick(returnData, pickFields)

  transformed.under_query_comment = returnData.under_query_comment || ''
  transformed.regionCode = get(returnData, 'metadata.nald.regionCode')
  transformed.formatId = get(returnData, 'metadata.nald.formatId')
  transformed.nald_date_from = getNaldStyleDate(moment(transformed.start_date).startOf('month').format('YYYY-MM-DD'))
  transformed.nald_ret_date = getNaldStyleDate(transformed.received_date)
  transformed.return_cycle_start = getReturnCycleStart(returnData)

  return transformed
}

const transformQuantity = (quantity = 0) => {
  if (quantity === null || toUpper(quantity) === 'NULL') {
    return null
  }

  const val = quantity.toString()
  return val.includes('.') ? parseFloat(val).toFixed(3) : val
}

const getUpperCasedFirstCharacter = flow(first, toUpper)

/**
 * Transforms user units to NALD unit flag
 * Gallons `gal` are transformed to I (imperial) in NALD
 * All other units (m3, l, Ml) are transformed to M (metric) in NALD
 * @param {String} unit - from user_unit property
 * @return {String} NALD unit flag
 */
const transformUnits = (unit) => {
  if (unit.toLowerCase() === 'gal') {
    return 'I'
  }
  return 'M'
}

/**
 * Takes a WRLS line object and converts to a smaller object ready
 * for loading into NALD
 */
const transformLine = lineData => {
  if (lineData.time_period === 'week') {
    throw new Error('Please use transformWeeklyLine for weekly lines')
  }
  const paths = ['start_date', 'end_date', 'time_period', 'reading_type', 'unit', 'user_unit']
  const line = pick(lineData, paths)
  line.quantity = transformQuantity(lineData.quantity)
  line.nald_reading_type = getUpperCasedFirstCharacter(line.reading_type)
  line.nald_time_period = getUpperCasedFirstCharacter(line.time_period)
  line.nald_units = transformUnits(line.user_unit)
  return line
}

/**
 * Takes a weekly WRLS line object and converts to 7 daily lines
 * objects for loading into NALD where weekly data is represented
 * using 7 day lines.
 */
const transformWeeklyLine = lineData => {
  if (lineData.time_period !== 'week') {
    throw new Error('Please use transformLine when not weekly')
  }

  const dailies = range(7).reduce((lines, daysForward) => {
    const date = getFutureDate(lineData.start_date, daysForward)
    const quantity = daysForward === 6 ? lineData.quantity : null

    const dailyLine = transformLine(Object.assign({}, lineData, {
      start_date: date,
      end_date: date,
      quantity,
      time_period: 'day'
    }))
    return [...lines, dailyLine]
  }, [])

  return dailies
}

/**
 * Filters lines to ensure that they are all within the return cycle
 * @param {Object} returnData - return row from return service
 * @param {Array} lines - array of return lines
 * @return {Array} array of filtered return lines
 */
const filterLines = (returnData, lines) => {
  const { returns_frequency: frequency } = returnData
  if (frequency !== 'week') {
    return lines
  }
  return lines.filter(line => isDateWithinReturnCycle(returnData, line.end_date))
}

module.exports = {
  transformReturn,
  transformLine,
  transformWeeklyLine,
  transformQuantity,
  transformUnits,
  filterLines,
  getReturnCycleStart
}
