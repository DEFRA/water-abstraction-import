'use strict'

const { generateUUID } = require('../../../lib/general.js')
const { daysFromPeriod, weeksFromPeriod, monthsFromPeriod } = require('../../../lib/return-helpers.js')

async function go (query, versionId, voidReturnLog, timestamp) {
  const {
    returnsFrequency,
    returnEndDate,
    returnStartDate
  } = voidReturnLog

  const lines = _lines(returnsFrequency, new Date(returnStartDate), new Date(returnEndDate))

  for (const line of lines) {
    await _createReturnLine(query, versionId, line, returnsFrequency, timestamp)
  }
}

async function _createReturnLine (query, versionId, line, returnsFrequency, timestamp) {
  const { endDate, startDate } = line
  const id = generateUUID()

  const params = [
    id,
    versionId,
    startDate,
    endDate,
    returnsFrequency,
    {},
    timestamp,
    timestamp
  ]
  const sql = `INSERT INTO "returns".lines (
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

  await query(sql, params)
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
