'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (newSubmissionLines, existingSubmissionLines, timestamp) {
  await _createNewSubmissionLines(newSubmissionLines, timestamp)
  await _deleteExistingSubmissionLines(existingSubmissionLines)
}

async function _createNewSubmissionLines (newSubmissionLines, timestamp) {
  for (const newSubmissionLine of newSubmissionLines) {
    const { endDate, lineId, quantity, readingType, startDate, timePeriod, userUnit, versionId } = newSubmissionLine

    const params = [
      lineId,
      versionId,
      quantity,
      startDate,
      endDate,
      timePeriod,
      {},
      timestamp,
      timestamp,
      readingType,
      userUnit
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
  $10,
  $11
);`

    await db.query(query, params)
  }
}

async function _deleteExistingSubmissionLines (existingSubmissionLines) {
  for (const existingSubmissionLine of existingSubmissionLines) {
    const params = [existingSubmissionLine.lineId]
    const query = 'DELETE FROM "returns".lines l WHERE l.line_id = $1;'

    await db.query(query, params)
  }
}

module.exports = {
  go
}
