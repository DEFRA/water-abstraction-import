'use strict'

const db = require('../../../lib/connectors/db.js')
const { generateUUID } = require('../../../lib/general.js')
const { weeksFromPeriod } = require('../../../lib/return-helpers.js')

async function go (returnMissingSubmission, timestamp) {
  let message

  const { returnEndDate, returnLogId, returnStartDate } = returnMissingSubmission

  try {
    const lines = weeksFromPeriod(returnStartDate, returnEndDate)

    const versionId = generateUUID()

    await db.transaction(async (query) => {
      await _createMissingSubmission(query, returnMissingSubmission, versionId, timestamp)
      await _createMissingSubmissionLines(query, lines, versionId, timestamp)
      await _updateReturnLog(query, returnLogId, timestamp)
    })

  } catch (error) {
    console.error(`Error: ${error.message}`, returnMissingSubmission, error)
    message = `Ret. log ${returnLogId} error: ${error.message}`
  }

  return message
}

async function _createMissingSubmission (query, returnMissingSubmission, versionId, timestamp) {
  const { returnId, returnLogId } = returnMissingSubmission

  const params = [
    versionId,
    returnId,
    {},
    timestamp,
    timestamp,
    returnLogId
  ]

  const sql = `INSERT INTO "returns".versions (
    version_id,
    return_id,
    user_id,
    user_type,
    version_number,
    metadata,
    created_at,
    updated_at,
    nil_return,
    "current",
    notes,
    return_log_id
  )
  VALUES (
    $1,
    $2,
    'imported.from@nald.gov.uk',
    'system',
    1,
    $3,
    $4,
    $5,
    FALSE,
    TRUE,
    'Created to allow import of NALD return lines not originally imported. See WATER-5779.',
    $6
  );`

    await query(sql, params)
}

async function _createMissingSubmissionLines (query, lines, versionId, timestamp) {
  for (const line of lines) {
    const { endDate, startDate } = line

    const params = [
      generateUUID(),
      versionId,
      startDate,
      endDate,
      'week',
      {},
      timestamp,
      timestamp,
      'measured',
      'm³'
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
  $9,
  $10
);`

    await query(sql, params)
  }
}

async function _updateReturnLog (query, returnLogId, timestamp) {
  const params = ['completed', timestamp, returnLogId]

  const sql = 'UPDATE "returns"."returns" r SET status = $1, updated_at = $2 WHERE r.id = $3;'

  await query(sql, params)
}

module.exports = {
  go
}
