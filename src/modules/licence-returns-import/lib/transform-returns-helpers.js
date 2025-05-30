'use strict'

const moment = require('moment')
const waterHelpers = require('@envage/water-abstraction-helpers')

const { returns: { date: { getPeriodStart } } } = waterHelpers
const naldFormatting = waterHelpers.nald.formatting

/**
 * Adds a date to the supplied array, if it is between but not equal to the
 * supplied start and end dates
 * @param {Array} dates
 * @param {String} date - YYYY-MM-DD, the date to add to array
 * @param {String} startDate - the start of the date range YYYY-MM-DD
 * @param {String} endDate - the end of the date range YYYY-MM-DD
 * @return {Array} new date array
 */
const addDate = (dates, date, startDate, endDate) => {
  const m = moment(date)
  const dateStr = m.format('YYYY-MM-DD')
  const arr = dates.slice()
  // NOTE: The `(]` tells moment whether the test should be inclusive or exclusive. Previously, it was `()` which tells
  // moment to exclude start and end date i.e. if m === end date return false. But we found this led to invalid return
  // logs when they are linked to a licence or return version that ends on the cycle date, for example, 2025-04-01 being
  // tested. The result would be a single return log dated 2024-04-01 to 2025-04-01, when it should be two return logs:
  // 2024-04-01 to 2025-03-31 and 2025-04-01 to 2025-04-01.
  //
  // So, now it means return false if `m === startDate` but true if `m === endDate`.
  // (see https://momentjscom.readthedocs.io/en/latest/moment/05-query/06-is-between/)
  const isValid = m.isBetween(startDate, endDate, 'day', '(]')
  const isUnique = !arr.includes(dateStr)
  if (isValid && isUnique) {
    arr.push(dateStr)
  }
  return arr
}

/**
 * Gets metadata object to store in returns table
 * @param {Object} format
 * @return {Object} return metadata
 */
const formatReturnMetadata = (format, purposes, points) => {
  const { isSummer, isUpload, isLineEntry } = mapProductionMonth(format.FORM_PRODN_MONTH)

  return {
    version: 1,
    description: format.SITE_DESCR,
    purposes: purposes.map(purpose => ({
      primary: {
        code: purpose.APUR_APPR_CODE,
        description: purpose.primary_purpose
      },
      secondary: {
        code: purpose.APUR_APSE_CODE,
        description: purpose.secondary_purpose
      },
      tertiary: {
        code: purpose.APUR_APUS_CODE,
        description: purpose.tertiary_purpose
      },
      alias: _getPurposeAlias(purpose)
    })),
    points: points.map(point => {
      return naldFormatting.formatAbstractionPoint(waterHelpers.nald.transformNull(point))
    }),
    nald: _formatReturnNaldMetadata(format),
    isTwoPartTariff: format.TPT_FLAG === 'Y',
    isSummer,
    isUpload: isUpload || isLineEntry
  }
}

/**
 * Gets cycles for a given format.  If the format has no effective end date,
 * then one is created at the end of the following year.  These will be filtered
 * out later by checking if form logs exist for the cycles calculated
 * @param {Object} row of data from NALD_RET_FORMATS
 * @return {Array} array of return cycles with startDate and endDate in each item
 */
const getFormatCycles = (format, splitDate) => {
  const {
    FORM_PRODN_MONTH: productionMonth
  } = format

  // Get summer cycle flag
  const { isSummer } = mapProductionMonth(productionMonth)

  // Get start/end date for format, taking into account version dates and
  // time-limited dates
  const startDate = getFormatStartDate(format)
  let endDate = getFormatEndDate(format)

  // If no end date, set date in future
  if (!endDate) {
    endDate = moment(getPeriodStart(moment().add(1, 'years'), isSummer)).subtract(1, 'day').format('YYYY-MM-DD')
  }

  const debug = ['10058869', '10058473', '10045292', '10053166'].includes(format.ID)

  return getReturnCycles(startDate, endDate, splitDate, isSummer, debug)
}

/**
 * Finds the earlist valid date that represents the end date of
 * the given format.
 *
 * Returns null, if no format end date.
 * @param {Object} format
 * @return {String} date YYYY-MM-DD or null
 */
const getFormatEndDate = (format) => {
  const {
    EFF_END_DATE,
    TIMELTD_END_DATE,
    LICENCE_LAPSED_DATE,
    LICENCE_REVOKED_DATE,
    LICENCE_EXPIRY_DATE
  } = format

  const dates = Object.values({
    EFF_END_DATE,
    TIMELTD_END_DATE,
    LICENCE_LAPSED_DATE,
    LICENCE_REVOKED_DATE,
    LICENCE_EXPIRY_DATE
  })

  const validDates = dates
    .map(date => moment(date, 'DD/MM/YYYY'))
    .filter(date => date.isValid())
    .sort(_chronologicalMomentSort)
    .map(date => date.format('YYYY-MM-DD'))

  return validDates.length ? validDates[0] : null
}

/**
 * Given format/return version data, gets the start and end dates of
 * this format
 * @param {Object} format
 * @return {String} date YYYY-MM-DD
 */
const getFormatStartDate = (format) => {
  const versionStartDate = moment(format.EFF_ST_DATE, 'DD/MM/YYYY')
  const timeLimitedStartDate = moment(format.TIMELTD_ST_DATE, 'DD/MM/YYYY')

  if (timeLimitedStartDate.isValid() && timeLimitedStartDate.isAfter(versionStartDate)) {
    return timeLimitedStartDate.format('YYYY-MM-DD')
  }
  return versionStartDate.format('YYYY-MM-DD')
}

/**
 * Gets summer/financial year return cycles, including splitting the cycles
 * by licence effective start date (split date)
 *
 * > This is misnamed! It's not getting 'return cycles' as we know them. Instead, it is getting the 'return periods' to
 * > generate WRLS return logs from. For example, the format passed to getFormatCycles() determines a start date and
 * > end date of 2022-06-23 to 2025-02-12 and is winter. What this returns is
 * >
 * > - 2022-06-23 to 2023-03-31
 * > - 2023-04-01 to 2024-03-31
 * > - 2024-04-01 to 2025-02-12
 * >
 * > Each represents a return log that needs creating/updating in WRLS. If it was actually return cycles the result
 * > would be
 * >
 * > - 2022-04-01 to 2023-03-31
 * > - 2023-04-01 to 2024-03-31
 * > - 2024-04-01 to 2025-03-31
 *
 * @param {String} startDate - YYYY-MM-DD
 * @param {String} endDate - YYYY-MM-DD
 * @param {String} splitDate - licence effective start date
 * @param {Boolean} isSummer - whether summer return cycle (default financial year)
 * @return {Array} of return cycle objects
 */
const getReturnCycles = (startDate, endDate, splitDate, isSummer = false) => {
  // NOTE: Misnamed. What they actually mean is period start dates
  let splits = []

  // Add split date
  if (splitDate) {
    splits = addDate(splits, splitDate, startDate, endDate)
  }

  // Date pointer should be within summer/financial year
  // NOTE: We initialise the first date to check to be the start date minus 1 year. getPeriodStart() will convert this
  // to be the start date for the period based on whether it is winter (start 1 April) or summer (start 1 November).
  // Previously, `datePtr` was initialised to the current year (no date part!) When passed to getPeriodStart() instead
  // of blowing up it fell back to 1970-01-01. This means every row, even if it starts in 2025, was being checked for
  // every year from 1970 onwards, every time the import ran!!
  let datePtr = moment(startDate).subtract(1, 'year')
  do {
    datePtr = getPeriodStart(datePtr, isSummer)
    splits = addDate(splits, datePtr, startDate, endDate)
    datePtr = moment(datePtr).add(1, 'year')
  }
  while (moment(datePtr).isSameOrBefore(endDate))

  const dates = _chunk([startDate, ..._sortAndPairSplitDates(splits), endDate], 2)

  return dates.map(arr => ({
    startDate: arr[0],
    endDate: arr[1],
    isCurrent: (splitDate === null) || moment(arr[0]).isSameOrAfter(splitDate)
  }))
}

/**
 * Gets return status
 * @param {String|null} receivedDate - the date received from NALD form logs YYYY-MM-DD, or null
 * @param {String} startDate - the start date of the return period
 * @return {String} status - completed|due
 */
const getStatus = receivedDate => receivedDate === null ? 'due' : 'completed'

/**
 * These are the actual translations. However, we WRLS only supports daily, weekly, and monthly returns, which
 * is why we translate fortnightly, quarterly, and annually to something else.
 *
 * - D = day
 * - W = week
 * - F = fortnight
 * - M = month
 * - Q = quarter
 * - A = year
 *
 * @private
 */
function mapPeriod (str) {
  const periods = {
    D: 'day',
    W: 'week',
    F: 'week',
    M: 'month',
    Q: 'month',
    A: 'month'
  }
  return periods[str]
}

/**
 * Maps NALD production month
 * @param {Number} month
 * @return {Object}
 */
const mapProductionMonth = (month) => {
  const intMonth = parseInt(month)
  return {
    isSummer: [65, 45, 80].includes(intMonth),
    isUpload: [65, 66].includes(intMonth),
    isLineEntry: [45, 46].includes(intMonth),
    formProduced: [80, 70].includes(intMonth)
  }
}

/**
 * A return may comprise more than one form log
 * If any form log has not been received, we return null
 * If there are no form log, return null
 * otherwise return form log received date
 *
 * @param {Array} logs - form log records
 */
const mapReceivedDate = (logs) => {
  if (logs.length === 0) {
    return null
  }

  const unreceivedLog = logs.some((log) => {
    return !log.received_date
  })

  if (unreceivedLog) {
    return null
  }

  return logs[logs.length - 1].received_date
}

const mapSentDate = (logs) => {
  if (logs.length === 0) {
    return null
  }

  const unsentLog = logs.some((log) => {
    return !log.sent_date
  })

  if (unsentLog) {
    return null
  }

  return logs[logs.length - 1].sent_date
}

/**
 * A sort comparator that will sort moment dates in ascending order
 *
 * @private
 */
const _chronologicalMomentSort = (left, right) => left.diff(right)

const _chunk = (arr, chunkSize = 1, cache = []) => {
  const tmp = [...arr]
  if (chunkSize <= 0) return cache
  while (tmp.length) cache.push(tmp.splice(0, chunkSize))
  return cache
}

/**
 * Gets additional NALD data to store in return metadata
 * @param {Object} format - the return format record from NALD data
 * @return {Object} metadata to store
 *
 * @private
 */
const _formatReturnNaldMetadata = (format) => {
  return {
    regionCode: parseInt(format.FGAC_REGION_CODE),
    areaCode: format.AREP_AREA_CODE,
    formatId: parseInt(format.ID),
    periodStartDay: format.ABS_PERIOD_ST_DAY,
    periodStartMonth: format.ABS_PERIOD_ST_MONTH,
    periodEndDay: format.ABS_PERIOD_END_DAY,
    periodEndMonth: format.ABS_PERIOD_END_MONTH
  }
}

/**
 * Returns the trimmed purpose alias if it is not
 * already empty or equal to 'null'
 *
 * @private
 */
const _getPurposeAlias = purpose => {
  const alias = (purpose.PURP_ALIAS || '').trim()

  if (!['', 'null'].includes(alias.toLowerCase())) {
    return alias
  }
}

/**
 * Split dates are the start date of the period.  This function
 * adds the period end dates to the array
 * @param {Array} arr - the array of split dates
 * @return {Array} an array containing the split dates and previous day
 *
 * @private
 */
const _sortAndPairSplitDates = (arr) => {
  const sorted = arr.map(val => moment(val).format('YYYY-MM-DD')).sort()

  return sorted.reduce((acc, value) => {
    acc.push(moment(value).subtract(1, 'day').format('YYYY-MM-DD'))
    acc.push(value)
    return acc
  }, [])
}

module.exports = {
  addDate,
  formatReturnMetadata,
  getFormatCycles,
  getFormatEndDate,
  getFormatStartDate,
  getReturnCycles,
  getStatus,
  mapPeriod,
  mapProductionMonth,
  mapReceivedDate,
  mapSentDate
}
