'use strict'

const db = require('../../../lib/connectors/db.js')
const { formatDateObjectToISO } = require('../../../lib/date-helpers.js')
const { generateUUID } = require('../../../lib/general.js')
const { daysFromPeriod, monthsFromPeriod, weeksFromPeriod } = require('../../../lib/return-helpers.js')

async function go (invalidNilReturn, timestamp) {
  let message

  const { reportingFrequency, returnEndDate, returnLogId, returnStartDate, versionId } = invalidNilReturn

  try {
    const missingSubmissionLines = _lines(reportingFrequency, new Date(returnStartDate), new Date(returnEndDate))

    await db.transaction(async (query) => {
      await _createMissingSubmissionLines(query, missingSubmissionLines, versionId, timestamp)
      await _updateReturnSubmission(query, versionId, timestamp)
    })
  } catch (error) {
    console.error(`Error: ${error.message}`, invalidNilReturn, error)
    message = `Ret. log ${returnLogId} error: ${error.message}`
  }

  return message
}

async function _createMissingSubmissionLines (query, missingSubmissionLines, versionId, timestamp) {
  for (const missingSubmissionLine of missingSubmissionLines) {
    const { endDate, startDate, timePeriod } = missingSubmissionLine

    const params = [
      generateUUID(),
      versionId,
      startDate,
      endDate,
      timePeriod,
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
}

function _lines (reportingFrequency, startDate, endDate) {
  let lines

  if (reportingFrequency === 'day') {
    lines = daysFromPeriod(startDate, endDate)
  } else if (reportingFrequency === 'week') {
    lines = weeksFromPeriod(startDate, endDate)
  } else {
    lines = monthsFromPeriod(startDate, endDate)
  }

  return lines.map((line) => {
    return {
      ...line,
      timePeriod: reportingFrequency
    }
  })
}

async function _updateReturnSubmission (query, versionId, timestamp) {
  const notes = `Corrected from Nil return on ${formatDateObjectToISO(timestamp)}. See WATER-5860.`
  const params = [notes, timestamp, versionId]
  const sql = `UPDATE "returns".versions v
SET
  nil_return = false,
  notes = $1,
  updated_at = $2
WHERE
  v.version_id = $3;`

  await query(sql, params)
}

module.exports = {
  go
}
