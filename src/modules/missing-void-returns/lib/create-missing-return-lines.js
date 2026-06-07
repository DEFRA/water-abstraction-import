'use strict'

const db = require('../../../lib/connectors/db.js')
const { generateUUID } = require('../../../lib/general.js')

async function go (missingReturn, timestamp) {
  const { lines, returnRequirement, versionId } = missingReturn

  for (const line of lines) {
    await _createReturnLine(line, versionId, returnRequirement.reportingFrequency, timestamp)
  }
}

async function _createReturnLine (line, versionId, reportingFrequency, timestamp) {
  const { end_date: endDate, qty, start_date: startDate } = line
  const id = generateUUID()
  const quantity = qty ?? null

  const params = [
    id,
    versionId,
    quantity,
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
  quantity,
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
  $9,
  'measured',
  'm³'
);`

  return db.query(query, params)
}

module.exports = {
  go
}
