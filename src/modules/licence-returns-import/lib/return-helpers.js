'use strict'

const moment = require('moment')

const db = require('../../../lib/connectors/db.js')
const queries = require('./queries.js')

function daysFromPeriod (periodStartDate, periodEndDate) {
  const days = []

  // We have to clone the date, else as we increment in the loop we'd be incrementing the param passed in!
  const clonedPeriodStartDate = _cloneDate(periodStartDate)

  while (clonedPeriodStartDate <= periodEndDate) { // eslint-disable-line
    // Clone the date again for the same reason above
    const startDate = _cloneDate(clonedPeriodStartDate)

    // No jiggery-pokery needed. Simply add it to the days array as both the start and end date
    days.push({ start_date: startDate, end_date: startDate })

    // Move the date to the next day, and round we go again!
    clonedPeriodStartDate.setDate(clonedPeriodStartDate.getDate() + 1)
  }

  return days
}

function weeksFromPeriod (periodStartDate, periodEndDate) {
  const weeks = []

  // We have to clone the date, else as we increment in the loop we'd be incrementing the param passed in!
  const clonedPeriodStartDate = _cloneDate(periodStartDate)

  while (clonedPeriodStartDate <= periodEndDate) { // eslint-disable-line
    // Is the date a Saturday?
    if (clonedPeriodStartDate.getDay() === 6) {
      // Yes! Clone the date again for the same reason above
      const endDate = _cloneDate(clonedPeriodStartDate)
      const startDate = _cloneDate(clonedPeriodStartDate)

      // Set the start date back to 6 days, which makes it the previous Sunday
      startDate.setDate(startDate.getDate() - 6)

      weeks.push({ start_date: startDate, end_date: endDate })

      // Now we have found our first week, we can just move the date forward by 6 days to the next Saturday, thus saving
      // a bunch of loop iterations
      clonedPeriodStartDate.setDate(clonedPeriodStartDate.getDate() + 6)
    } else {
      // Move the date to the next day, and try again!
      clonedPeriodStartDate.setDate(clonedPeriodStartDate.getDate() + 1)
    }
  }

  return weeks
}

function monthsFromPeriod (periodStartDate, periodEndDate) {
  const months = []

  // We have to clone the date, else as we increment in the loop we'd be incrementing the param passed in!
  const clonedPeriodStartDate = _cloneDate(periodStartDate)

  while (clonedPeriodStartDate <= periodEndDate) { // eslint-disable-line
    // Bump the returnLogStartDate to the next month, for example 2013-04-15 becomes 2013-05-15
    clonedPeriodStartDate.setMonth(clonedPeriodStartDate.getMonth() + 1)

    // Then clone that for our end date. "But we want the last day in April!?" we hear you scream :-)
    const endDate = _cloneDate(clonedPeriodStartDate)

    // We use some JavaScript magic to move endDate back to the last of the month. By setting the date (the 01, 02, 03
    // etc part) to 0, it's the equivalent of setting it to the 1st, then asking JavaScript to minus 1 day. That's
    // how we get to 2013-04-30. It also means we don't need to worry about which months have 30 vs 31 days, or whether
    // we are in a leap year!
    endDate.setDate(0)

    // Set start date to first of the month. Passing it in as a string to new Date() helps keep it UTC rather than local
    const startDate = new Date(`${endDate.getFullYear()}-${endDate.getMonth() + 1}-01`)

    months.push({ start_date: startDate, end_date: endDate })
  }

  return months
}

/**
 * Gets form logs for specified licence number
 * @param {String} licenceNumber
 * @return {Promise} resolves with array of DB records
 */
const getFormats = (licenceNumber) => {
  return db.query(queries.getFormats, [licenceNumber])
}

/**
 * Get purposes attached to a returns format
 * @param {Number} formatId - the ARTY_ID=
 * @param {Number} region code - FGAC_REGION_CODE
 * @return {Promise} resolves with array of DB records
 */
const getFormatPurposes = (formatId, regionCode) => {
  return db.query(queries.getFormatPurposes, [formatId, regionCode])
}

/**
 * Get points attached to a returns format
 * @param {Number} formatId - the ARTY_ID=
 * @param {Number} region code - FGAC_REGION_CODE
 * @return {Promise} resolves with array of DB records
 */
const getFormatPoints = (formatId, regionCode) => {
  return db.query(queries.getFormatPoints, [formatId, regionCode])
}

/**
 * Get form logs for specified return format
 * @param {Number} formatId - the ARTY_ID
 * @return {Promise} resolves with array of DB records
 */
const getLogs = (formatId, regionCode) => {
  return db.query(queries.getLogs, [formatId, regionCode])
}

/**
 * Get returns lines
 * @param {Number} formatId - the ARTY_ID=
 * @param {Number} region code - FGAC_REGION_CODE
 * @param {String} dateFrom - e.g. YYYY-MM-DD
 * @param {String} dateTo - e.g. YYYY-MM-DD
 * @return {Promise} resolves with array of DB records
 */
const getLines = (formatId, regionCode, dateFrom, dateTo) => {
  const params = [formatId, regionCode, dateFrom, dateTo]
  return db.query(queries.getLines, params)
}

/**
 * Get returns lines for log
 * @param {Number} formatId - the ARTY_ID=
 * @param {Number} region code - FGAC_REGION_CODE
 * @param {String} logDateFrom - e.g. DD/MM/YYYY
 * @return {Promise} resolves with array of DB records
 */
const getLogLines = (formatId, regionCode, logDateFrom) => {
  const from = moment(logDateFrom, 'DD/MM/YYYY').format('YYYYMMDD') + '000000'
  const params = [formatId, regionCode, from]
  return db.query(queries.getLogLines, params)
}

/**
 * Checks for nil return over the specified time period
 * @param {Number} formatId - the ARTY_ID=
 * @param {Number} region code - FGAC_REGION_CODE
 * @param {String} dateFrom - e.g. YYYY-MM-DD
 * @param {String} dateTo - e.g. YYYY-MM-DD
 * @return {Promise} resolves with boolean
 */
const isNilReturn = async (formatId, regionCode, dateFrom, dateTo) => {
  const params = [formatId, regionCode, dateFrom, dateTo]
  const rows = await db.query(queries.isNilReturn, params)
  return rows[0].total_qty === 0
}

/**
 * Gets the split date for considering returns as either current / non current
 * Originally this date was the EFF_ST_DATE of the current licence version
 * however this has been modified to only split if a licence version has
 * a mod log reason code of SUCC - 'Succession To A Whole Licence/Licence Transfer'
 * @param {String} licenceNumber - the licence number
 * @return {String|null} split date in format YYYY-MM-DD, or null if none found
 */
const getSplitDate = async (licenceNumber) => {
  const rows = await db.query(queries.getSplitDate, [licenceNumber])

  return (rows.length === 1)
    ? moment(rows[0].EFF_ST_DATE, 'DD/MM/YYYY').format('YYYY-MM-DD')
    : null
}

/**
 * Gets the reason code from the mod log relating to a new return version
 * @param  {Number}  licenceId     - the NALD licence ID
 * @param  {Number}  regionCode    - the NALD FGAC_REGION_CODE
 * @param  {Number}  versionNumber - the version number of the return
 * @return {Promise<Array>}          resolves with reason codes
 */
const getReturnVersionReasons = async (licenceId, regionCode, versionNumber) => {
  const params = [licenceId, versionNumber, regionCode]

  return db.query(queries.getReturnVersionReasons, params)
}

function _cloneDate (dateToClone) {
  const year = dateToClone.getFullYear()
  const month = dateToClone.getMonth() + 1
  const day = dateToClone.getDate()

  return new Date(`${year}-${month}-${day}`)
}

module.exports = {
  getFormats,
  getFormatPurposes,
  getFormatPoints,
  getLogs,
  getLines,
  getLogLines,
  isNilReturn,
  getSplitDate,
  getReturnVersionReasons,
  daysFromPeriod,
  weeksFromPeriod,
  monthsFromPeriod
}
