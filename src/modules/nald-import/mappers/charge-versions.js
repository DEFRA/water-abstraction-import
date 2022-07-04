'use strict'

const { isNull, sortBy } = require('lodash')
const moment = require('moment')
const dateHelpers = require('../../../lib/date-helpers')

const DATE_FORMAT = 'YYYY-MM-DD'

const STATUS_SUPERSEDED = 'superseded'
const STATUS_CURRENT = 'current'

const PERIOD_DAY = 'day'

/**
 * Whether this charge version is considered an "error"
 * This is either:
 * - The error flag is set in NALD
 * - The start date is the same as the following charge version
 * @param {Object} chargeVersion
 * @param {Object} nextChargeVersion - next charge version in date/version sequence
 * @return {Boolean}
 */
const isErrorChargeVersion = (chargeVersion, nextChargeVersion) => {
  const isErrorStatus = chargeVersion.error
  const isSameStartDate = nextChargeVersion && (chargeVersion.start_date === nextChargeVersion.start_date)
  return isErrorStatus || isSameStartDate
}

/**
 * Maps status to equivalent in WRLS
 * @param {Object} chargeVersion
 * @param {Number} index - the index in the mapping
 * @param {Array} arr - the source array in the mapping
 * @return {Object} charge version updated with mapped status
 */
const mapChargeVersionStatus = (chargeVersion, index, arr) => {
  const nextRow = arr[index + 1]

  return {
    ...chargeVersion,
    status: isErrorChargeVersion(chargeVersion, nextRow) ? STATUS_SUPERSEDED : STATUS_CURRENT
  }
}

/**
 * Maps a charge version to a new version where the end date is
 * modified to prevent it exceeding start date of following CV
 * @param {Object} chargeVersion
 * @param {Number} index
 * @param {Array} source array
 * @return {Object}
 */
const mapChargeVersionEndDate = (chargeVersion, index, arr) => {
  // If there is no following row, or this row is an error, don't modify date
  const nextRow = arr[index + 1]
  if (!nextRow || isErrorChargeVersion(chargeVersion, nextRow)) {
    return chargeVersion
  }
  const maxEndDate = moment(nextRow.start_date, DATE_FORMAT).subtract(1, PERIOD_DAY).format(DATE_FORMAT)
  const endDate = dateHelpers.getMinDate([chargeVersion.end_date, maxEndDate]).format(DATE_FORMAT)
  return {
    ...chargeVersion,
    end_date: endDate
  }
}

/**
 * Gets the maximum version number from an array of charge versions.
 * Returns 0 if the array is empty
 * @param {Array<Object>} chargeVersions
 * @return {Number}
 */
const getMaxVersionNumber = chargeVersions =>
  Math.max(...chargeVersions.map(cv => cv.version_number), 0)

const getPreviousDay = str => moment(str).subtract(1, PERIOD_DAY).format(DATE_FORMAT)
const getNextDay = str => moment(str).add(1, PERIOD_DAY).format(DATE_FORMAT)

const isCurrentChargeVersion = chargeVersion => chargeVersion.status === STATUS_CURRENT

const createGap = (startDate, endDate, externalId) => ({
  startDate,
  endDate,
  externalId
})

/**
 * Gets history gaps as an array [[startDate, endDate], ...]
 * @param {Object} licence
 * @param {Array<Object>} chargeVersions
 * @return {Array<Array>} date pairs
 */
const getChargeVersionHistoryGaps = (licence, chargeVersions) => {
  const currentChargeVersions = chargeVersions.filter(isCurrentChargeVersion)

  // If there are no charge versions, gap is entire licence timeline
  if (currentChargeVersions.length === 0) {
    return [createGap(licence.start_date, licence.end_date, `${licence.FGAC_REGION_CODE}:${licence.ID}:licenceStart-licenceEnd`)]
  }

  const licenceStart = moment(licence.start_date)
  const licenceEnd = isNull(licence.end_date) ? null : moment(licence.end_date)

  return currentChargeVersions
    .reduce((acc, chargeVersion, i, source) => {
      // Gap between licence start date and first charge version
      if (i === 0 && licenceStart.isBefore(chargeVersion.start_date, PERIOD_DAY)) {
        acc.push(
          createGap(licence.start_date, getPreviousDay(chargeVersion.start_date), `${licence.FGAC_REGION_CODE}:${licence.ID}:licenceStart`)
        )
      }

      // Gaps between charge versions
      const next = source[i + 1]
      const nextPreviousDay = next && getPreviousDay(next.start_date)

      if (next && chargeVersion.end_date !== nextPreviousDay) {
        acc.push(
          createGap(getNextDay(chargeVersion.end_date), nextPreviousDay, `${licence.FGAC_REGION_CODE}:${licence.ID}:${chargeVersion.version_number}-${next.version_number}`)
        )
      }

      // Gap between last charge version and licence end date
      if (!next && !isNull(chargeVersion.end_date) && (isNull(licenceEnd) || licenceEnd.isAfter(chargeVersion.end_date, PERIOD_DAY))) {
        acc.push(
          createGap(getNextDay(chargeVersion.end_date), licence.end_date, `${licence.FGAC_REGION_CODE}:${licence.ID}:licenceEnd`)
        )
      }

      return acc
    }, [])
}

const mapHistoryGapToChargeVersion = (gap, licence, versionNumber) => ({
  start_date: gap.startDate,
  end_date: gap.endDate,
  status: STATUS_CURRENT,
  version_number: versionNumber,
  external_id: gap.externalId,
  is_nald_gap: true
})

/**
 * Maps licence and NALD charge version data to an array of
 * charge versions for import to WRLS
 * @param {Object} licence
 * @param {Array<Object>} chargeVersions
 * @return {Array<Object>} charge versions
 */
const mapNALDChargeVersionsToWRLS = (licence, chargeVersions) => {
  // Map NALD charge versions to WRLS (end dates and status can change)
  const wrlsChargeVersions = chargeVersions
    .map(mapChargeVersionEndDate)
    .map(mapChargeVersionStatus)

  // Calculate non-chargeable date ranges
  const maxVersionNumber = getMaxVersionNumber(wrlsChargeVersions)
  const nonChargeableChargeVersions = getChargeVersionHistoryGaps(licence, wrlsChargeVersions)
    .map((gap, i) => mapHistoryGapToChargeVersion(gap, licence, i + maxVersionNumber + 1))

  // Combine and sort
  const arr = [
    ...wrlsChargeVersions,
    ...nonChargeableChargeVersions
  ]
  return sortBy(arr, ['start_date', 'version_number'])
}

module.exports = {
  mapNALDChargeVersionsToWRLS
}
