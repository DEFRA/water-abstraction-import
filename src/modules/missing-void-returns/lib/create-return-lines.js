'use strict'

const db = require('../../../lib/connectors/db.js')
const { generateUUID } = require('../../../lib/general.js')
const { daysFromPeriod, weeksFromPeriod, monthsFromPeriod } = require('../../../lib/return-helpers.js')

async function go (missingVoidReturn, returnSubmissionId, timestamp) {
  const {
    reporting_frequency: reportingFrequency,
    return_cycle_end_date: endDate,
    return_cycle_start_date: startDate
  } = missingVoidReturn

  const lines = _lines(reportingFrequency, new Date(startDate), new Date(endDate))

  for (const line of lines) {
    await _createReturnLine(line, returnSubmissionId, reportingFrequency, timestamp)
  }
}

async function _createReturnLine (line, returnSubmissionId, reportingFrequency, timestamp) {
  const { end_date: endDate, start_date: startDate } = line
  const id = generateUUID()

  const params = [
    id,
    returnSubmissionId,
    startDate,
    endDate,
    reportingFrequency,
    {},
    timestamp,
    timestamp
  ]
  const query = `INSERT INTO "returns".lines (
  line_id,
  version_id,
  start_date,
  end_date,
  time_period,
  metadata,
  created_at,
  updated_at,
  reading_type,
  user_unit
)
VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6,
  $7,
  $8,
  'measured',
  'm³'
);`

  return db.query(query, params)
}

function _lines (reportingFrequency, startDate, endDate) {
  if (reportingFrequency === 'day') {
    return daysFromPeriod(startDate, endDate)
  }

  if (reportingFrequency === 'week') {
    return weeksFromPeriod(startDate, endDate)
  }

  return monthsFromPeriod(startDate, endDate)
}

module.exports = {
  go
}
