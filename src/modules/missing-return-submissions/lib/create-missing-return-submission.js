'use strict'

const CreateReturnLines = require('./create-return-lines.js')
const CreateReturnSubmission = require('./create-return-submission.js')
const db = require('../../../lib/connectors/db.js')
const FetchNaldReturnLines = require('./fetch-nald-return-lines.js')
const { daysFromPeriod, weeksFromPeriod, monthsFromPeriod } = require('../../../lib/return-helpers.js')

async function go (collatedReturnLog, timestamp) {
  const { regionId, returnLogs, returnReference } = collatedReturnLog

  const naldReturnLines = await FetchNaldReturnLines.go(regionId, returnReference)

  for (const returnLog of returnLogs) {
    const matched = _matchLines(returnLog, naldReturnLines)

    if (matched) {
      const versionId = await CreateReturnSubmission.go(returnLog, timestamp)

      await CreateReturnLines.go(returnLog, versionId, timestamp)
      await _updateReturnLog(returnLog.id, timestamp)
    }
  }
}

function _assignNaldLines (naldLines, lines) {
  for (const naldLine of naldLines) {
    if (naldLine.matched) {
      continue
    }

    const line = lines.find((line) => {
      const onOrAfterStartDate = line.start_date <= naldLine.returnDate
      const onOrBeforeEndDate = line.end_date >= naldLine.returnDate

      return onOrAfterStartDate && onOrBeforeEndDate
    })

    if (line) {
      if (line.qty) {
        line.qty += naldLine.qty
      } else {
        line.qty = naldLine.qty
      }
      naldLine.matched = true
    }
  }

  return lines.some((line) => {
    return line?.qty >= 0
  })
}

function _lines (returnsFrequency, startDate, endDate) {
  if (returnsFrequency === 'day') {
    return daysFromPeriod(startDate, endDate)
  }

  if (returnsFrequency === 'fortnight' || returnsFrequency === 'week') {
    return weeksFromPeriod(startDate, endDate)
  }

  return monthsFromPeriod(startDate, endDate)
}

function _matchLines (returnLog, naldLines) {
  const { endDate, returnsFrequency, startDate } = returnLog

  returnLog.lines = _lines(returnsFrequency, startDate, endDate)

  return _assignNaldLines(naldLines, returnLog.lines)
}

async function _updateReturnLog (returnLogId, timestamp) {
  const params = [timestamp, returnLogId]

  const query = `UPDATE "returns"."returns" r
SET
  status = 'completed',
  updated_at = $1
WHERE r.id = $2;
  `

  await db.query(query, params)
}

module.exports = {
  go
}
