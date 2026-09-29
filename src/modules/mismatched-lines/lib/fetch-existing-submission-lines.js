'use strict'

const db = require('../../../lib/connectors/db.js')
const AdjustForMonthlyToWeekly = require('./adjust-for-monthly-to-weekly.js')

async function go (versionId, returnsFrequency) {
  const existingSubmissionLines = await _fetch(versionId)

  const needsAdjusting = returnsFrequency === 'week' && existingSubmissionLines[0].timePeriod === 'month'

  if (needsAdjusting) {
    AdjustForMonthlyToWeekly.go(existingSubmissionLines)
  }

  return { existingSubmissionLines, needsAdjusting }
}

async function _fetch (versionId) {
  const params = [versionId]
  const query = `SELECT
  l.line_id,
  l.quantity,
  l.start_date,
  l.end_date,
  l.time_period,
  l.reading_type,
  l.user_unit,
  (false) AS allocated
FROM
  "returns".lines l
WHERE
  l.version_id = $1;
  `

  const results = await db.query(query, params)

  return results.map((result) => {
    return {
      lineId: result.line_id,
      quantity: result.quantity,
      startDate: result.start_date,
      endDate: result.end_date,
      timePeriod: result.time_period,
      readingType: result.reading_type,
      userUnit: result.user_unit,
      allocated: result.allocated
    }
  })
}

module.exports = {
  go
}
