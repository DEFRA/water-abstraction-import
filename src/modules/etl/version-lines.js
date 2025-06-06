'use strict'

const Boom = require('@hapi/boom')

const db = require('../../lib/connectors/db.js')
const WeekDailyDate = require('./lib/week-daily-date.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')
const GenerateNilLines = require('./lib/generate-nil-lines.js')

async function go (returnSubmissionId) {
  const response = { error: null }

  try {
    const startTime = currentTimeInNanoseconds()

    let returnSubmission = await _fetchReturnSubmission(returnSubmissionId)

    if (!returnSubmission) {
      throw Boom.notFound(`Data not found for ${returnSubmissionId}`)
    }

    returnSubmission = _transformReturnSubmission(returnSubmission)

    response.data = _extractReturnData(returnSubmission)
    response.data.lines = await _returnSubmissionLines(returnSubmission, returnSubmissionId)

    calculateAndLogTimeTaken(startTime, 'etl-version-lines: complete')
  } catch (error) {
    global.GlobalNotifier.omg(
      'etl-version-lines: errored',
      { versionId: returnSubmissionId, errorMessage: error.message, errorStack: error.stack }
    )

    throw error
  }

  return response
}

function _extractReturnData (returnSubmission) {
  return {
    nil_return: returnSubmission.nil_return,
    under_query: returnSubmission.under_query,
    under_query_comment: returnSubmission.under_query_comment,
    return: {
      returns_frequency: returnSubmission.returns_frequency,
      licence_ref: returnSubmission.licence_ref,
      start_date: returnSubmission.start_date,
      end_date: returnSubmission.end_date,
      status: returnSubmission.status,
      received_date: returnSubmission.received_date,
      under_query: returnSubmission.under_query,
      under_query_comment: returnSubmission.under_query_comment,
      regionCode: returnSubmission.regionCode,
      formatId: returnSubmission.formatId,
      nald_date_from: returnSubmission.nald_date_from,
      nald_ret_date: returnSubmission.nald_ret_date,
      return_cycle_start: returnSubmission.return_cycle_start
    }
  }
}

async function _fetchReturnSubmission (returnSubmissionId) {
  const params = [returnSubmissionId]
  const query = `
    SELECT
      r.returns_frequency,
      r.licence_ref,
      r.start_date,
      r.end_date,
      r.status,
      r.received_date,
      r.under_query,
      (CASE
        WHEN r.under_query_comment IS NULL THEN
          ''
        ELSE
          r.under_query_comment
      END) AS under_query_comment,
      r.return_id,
      SUBSTRING(r.return_id, 4, 1) AS region_code,
      r.return_requirement,
      to_char(date_trunc('month', r.start_date)::date, 'YYYYMMDD000000') AS nald_date_from,
      to_char(r.received_date, 'YYYYMMDD000000') AS nald_ret_date,
      rc.start_date AS return_cycle_start,
      rc.end_date AS return_cycle_end,
      r.metadata->'nald'->>'periodStartDay' AS abs_period_start_day,
      r.metadata->'nald'->>'periodStartMonth' AS abs_period_start_month,
      r.metadata->'nald'->>'periodEndDay' AS abs_period_end_day,
      r.metadata->'nald'->>'periodEndMonth' AS abs_period_end_month,
      v.nil_return
    FROM
      "returns".versions v
    INNER JOIN "returns"."returns" r
      ON r.return_id  = v.return_id
    INNER JOIN "returns".return_cycles rc
      ON rc.return_cycle_id = r.return_cycle_id
    WHERE
      v.version_id = $1
    LIMIT 1;
  `

  const results = await db.query(query, params)

  if (results.length === 0) {
    return null
  }

  return results[0]
}

async function _fetchReturnSubmissionLines (returnSubmissionId) {
  const params = [returnSubmissionId]
  const query = `
    SELECT
      l.start_date,
      l.end_date,
      l.time_period,
      l.reading_type,
      l.unit,
      l.user_unit,
      l.quantity
    FROM
      "returns".lines l
    WHERE
      l.version_id = $1;
  `

  return db.query(query, params)
}

/**
 * Converts a return submission line's user unit to the NALD equivalent
 *
 * Gallons (gal) are transformed to I (imperial) in NALD. All other units (m3, l, Ml) are transformed to M (metric) in
 * NALD
 *
 * @param {Object} line - a single return submission line
 *
 * @return {String} the line's unit transformed to the NALD equivalent
 */
function _naldUnits (line) {
  if (line.user_unit === 'gal') {
    return 'I'
  }

  return 'M'
}

function _quantity (line) {
  if (!line.quantity) {
    return null
  }

  if (line.quantity.toString().includes('.')) {
    return parseFloat(line.quantity).toFixed(3)
  }

  return line.quantity
}

async function _returnSubmissionLines (returnSubmission, returnSubmissionId) {
  if (returnSubmission.nil_return) {
    return GenerateNilLines.go(returnSubmission)
  }

  const returnSubmissionLines = await _fetchReturnSubmissionLines(returnSubmissionId)

  return _transformReturnSubmissionLines(returnSubmission, returnSubmissionLines)
}

function _standardLine (line) {
  return {
    start_date: line.start_date,
    end_date: line.end_date,
    time_period: line.time_period,
    reading_type: line.reading_type,
    unit: line.unit,
    user_unit: line.user_unit,
    quantity: _quantity(line),
    nald_reading_type: line.reading_type[0].toUpperCase(),
    nald_time_period: line.time_period[0].toUpperCase(),
    nald_units: _naldUnits(line)
  }
}

function _transformReturnSubmission (returnSubmission) {
  return {
    ...returnSubmission,
    abs_period_start_day: parseInt(returnSubmission.abs_period_start_day),
    abs_period_start_month: parseInt(returnSubmission.abs_period_start_month),
    abs_period_end_day: parseInt(returnSubmission.abs_period_end_day),
    abs_period_end_month: parseInt(returnSubmission.abs_period_end_month),
    regionCode: parseInt(returnSubmission.region_code),
    formatId: parseInt(returnSubmission.return_requirement)

  }
}

function _transformReturnSubmissionLines (returnSubmission, returnSubmissionLines) {
  const lines = []

  for (const returnSubmissionLine of returnSubmissionLines) {
    if (returnSubmissionLine.time_period === 'week') {
      lines.push(..._weeklyLine(returnSubmission, returnSubmissionLine))

      continue
    }

    lines.push(_standardLine(returnSubmissionLine))
  }

  return lines
}

/**
 * Transforms a weekly WRLS return submission line into an array of 7 daily lines
 *
 * Each daily line object represents a day within the week, with the quantity only set on the last day (Saturday). In
 * NALD, a weekly return is represented as a daily return, with the quantity just applied to the last day of the week.
 *
 * @param {Object} line - a single weekly return submission line
 *
 * @returns {Object[]} The submission line transformed into 7 daily lines
 */

function _weeklyLine (returnSubmission, line) {
  const { end_date: returnEnd, start_date: returnStart } = returnSubmission
  const { reading_type: readingType, start_date: startDate, unit, user_unit: userUnit } = line
  const weeklyLines = []

  for (let numDaysForward = 0; numDaysForward < 7; numDaysForward++) {
    const dailyDate = WeekDailyDate.go(returnStart, returnEnd, startDate, numDaysForward)

    if (!dailyDate) {
      continue
    }

    weeklyLines.push({
      start_date: dailyDate,
      end_date: dailyDate,
      time_period: 'day',
      reading_type: readingType,
      unit,
      user_unit: userUnit,
      quantity: numDaysForward === 6 ? _quantity(line) : null,
      nald_reading_type: readingType[0].toUpperCase(),
      nald_time_period: 'D',
      nald_units: _naldUnits(line)
    })
  }

  return weeklyLines
}

module.exports = {
  go
}
