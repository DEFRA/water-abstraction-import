'use strict'

async function go (query, newSubmissionLines, existingSubmissionLines, timestamp) {
  await _deleteExistingSubmissionLines(query, existingSubmissionLines)
  await _createNewSubmissionLines(query, newSubmissionLines, timestamp)
}

async function _createNewSubmissionLines (query, newSubmissionLines, timestamp) {
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
    const sql = `INSERT INTO "returns".lines (
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

    await query(sql, params)
  }
}

async function _deleteExistingSubmissionLines (query, existingSubmissionLines) {
  for (const existingSubmissionLine of existingSubmissionLines) {
    const params = [existingSubmissionLine.lineId]
    const sql = 'DELETE FROM "returns".lines l WHERE l.line_id = $1;'

    await query(sql, params)
  }
}

module.exports = {
  go
}
