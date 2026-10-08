'use strict'

const db = require('../../../lib/connectors/db.js')
const FetchExistingSubmissionLines = require('./fetch-existing-submission-lines.js')
const { generateUUID } = require('../../../lib/general.js')
const { daysFromPeriod, monthsFromPeriod, weeksFromPeriod } = require('../../../lib/return-helpers.js')

async function go (submissionWithGap, timestamp) {
  let message

  const { reportingFrequency, returnEndDate, returnLogId, returnStartDate, versionId } = submissionWithGap

  try {
    const existingSubmissionLines = await FetchExistingSubmissionLines.go(versionId)

    const expectedSubmissionLines = _lines(reportingFrequency, returnStartDate, returnEndDate)

    const missingSubmissionLines = _determineMissingLines(existingSubmissionLines, expectedSubmissionLines)

    await _createMissingSubmissionLines(existingSubmissionLines[0], missingSubmissionLines, versionId, timestamp)
  } catch (error) {
    console.error(`Error: ${error.message}`, submissionWithGap, error)
    message = `Ret. log ${returnLogId} / Version ${versionId} error: ${error.message}`
  }

  return message
}

async function _createMissingSubmissionLines (existingSubmissionLine, missingSubmissionLines, versionId, timestamp) {
  const { readingType, userUnit, timePeriod } = existingSubmissionLine

  for (const missingSubmissionLine of missingSubmissionLines) {
    const { endDate, startDate } = missingSubmissionLine

    const params = [
      generateUUID(),
      versionId,
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

    await db.query(sql, params)
  }
}

function _determineMissingLines (existingSubmissionLines, expectedSubmissionLines) {
  // Iterate through the expected lines and mark them as matched if they exist in the existing submission lines
  for (const expectedLine of expectedSubmissionLines) {
    expectedLine.matched = existingSubmissionLines.some((existingLine) => {
      return existingLine.endDate.getTime() === expectedLine.endDate.getTime()
    })
  }

  // Filter out all those that didn't match and return them as the missing lines
  return expectedSubmissionLines.filter((expectedLine) => {
    return !expectedLine.matched
  })
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
