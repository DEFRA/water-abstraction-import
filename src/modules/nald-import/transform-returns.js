'use strict'

const moment = require('moment')
const queries = require('./lib/nald-queries/returns')

const helpers = require('./lib/transform-returns-helpers.js')

const dueDate = require('./lib/due-date')

const { getReturnId } = require('@envage/water-abstraction-helpers').returns

/**
 * Loads licence formats from DB
 * @param {String} licenceNumber
 * @return {Promise} resolves with array of formats
 */
const getLicenceFormats = async (licenceNumber) => {
  const splitDate = await queries.getSplitDate(licenceNumber)

  const formats = await queries.getFormats(licenceNumber)

  // Load format data
  for (const format of formats) {
    format.purposes = await queries.getFormatPurposes(format.ID, format.FGAC_REGION_CODE)
    format.points = await queries.getFormatPoints(format.ID, format.FGAC_REGION_CODE)
    format.cycles = helpers.getFormatCycles(format, splitDate)
  }
  return formats
}

const getCycleLogs = (logs, startDate, endDate) => {
  return logs.filter(log => {
    return (
      moment(log.DATE_TO, 'DD/MM/YYYY').isSameOrAfter(startDate) &&
      moment(log.DATE_FROM, 'DD/MM/YYYY').isSameOrBefore(endDate)
    )
  })
}

/**
 * @param {String} licenceNumber - the abstraction licence number
 */
const buildReturnsPacket = async (licenceNumber) => {
  const formats = await getLicenceFormats(licenceNumber)

  const returnsData = {
    returns: []
  }

  for (const format of formats) {
    // Get all the logs for the format here and filter later by cycle.
    // This saves having to make many requests to the database for
    // each format cycle.
    const logs = await queries.getLogs(format.ID, format.FGAC_REGION_CODE)

    for (const cycle of format.cycles) {
      const { startDate, endDate, isCurrent } = cycle

      // Get all form logs relating to this cycle
      const cycleLogs = getCycleLogs(logs, startDate, endDate)

      // Only create return cycles for formats with logs to allow NALD prepop to
      // drive online returns
      if (cycleLogs.length === 0) {
        continue
      }

      const returnId = getReturnId(format.FGAC_REGION_CODE, licenceNumber, format.ID, startDate, endDate)
      const receivedDate = helpers.mapReceivedDate(cycleLogs)
      const status = helpers.getStatus(receivedDate)

      // Create new return row
      const returnRow = {
        return_id: returnId,
        regime: 'water',
        licence_type: 'abstraction',
        licence_ref: licenceNumber,
        start_date: startDate,
        end_date: endDate,
        due_date: await dueDate.getDueDate(endDate, format),
        returns_frequency: helpers.mapPeriod(format.ARTC_REC_FREQ_CODE),
        status,
        source: 'NALD',
        metadata: JSON.stringify({
          ...helpers.formatReturnMetadata(format),
          isCurrent,
          isFinal: moment(endDate).isSame(helpers.getFormatEndDate(format), 'day')
        }),
        received_date: receivedDate,
        return_requirement: format.ID
      }

      returnsData.returns.push(returnRow)
    }
  }

  return returnsData
}

module.exports = {
  buildReturnsPacket,
  getLicenceFormats,
  getCycleLogs
}
