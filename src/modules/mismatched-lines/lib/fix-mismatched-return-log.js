'use strict'

const FetchExistingSubmissionLines = require('./fetch-existing-submission-lines.js')
const ResetSubmissionLines = require('./reset-submission-lines.js')
const ResetSubmissionMetadata = require('./reset-submission-metadata.js')
const { generateUUID } = require('../../../lib/general.js')
const { daysFromPeriod, weeksFromPeriod, monthsFromPeriod } = require('../../../lib/return-helpers.js')

async function go (mismatchedReturnLog, timestamp) {
  const {
    end_date: endDate,
    returns_frequency: returnsFrequency,
    start_date: startDate,
    version_id: versionId
  } = mismatchedReturnLog

  const { existingSubmissionLines, needsAdjusting } = await FetchExistingSubmissionLines.go(versionId, returnsFrequency)
  const newSubmissionLines = _lines(returnsFrequency, new Date(startDate), new Date(endDate))

  _populateNewLines(returnsFrequency, versionId, existingSubmissionLines, newSubmissionLines)

  _mopUp(newSubmissionLines, existingSubmissionLines)

  await ResetSubmissionLines.go(newSubmissionLines, existingSubmissionLines, timestamp)

  // A return submitted using abstraction volumes can still have a meter, but won't have readings
  if (mismatchedReturnLog.metadata?.meters.length && mismatchedReturnLog.metadata?.meters[0]?.readings) {
    await ResetSubmissionMetadata.go(newSubmissionLines, versionId, mismatchedReturnLog.metadata, needsAdjusting, timestamp)
  }
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

function _mopUp (newSubmissionLines, existingSubmissionLines) {
  const unallocatedExistingLines = existingSubmissionLines.filter((line) => {
    return !line.allocated
  })

  let unallocatedQuantity
  for (const line of unallocatedExistingLines) {
    if (line.quantity) {
      unallocatedQuantity = (unallocatedQuantity || 0) + Number(line.quantity)
    }
  }

  // If we have an unallocated quantity then add it to the last new line. We have to take care to handle the case where
  // the last new line might not have a quantity yet.
  if (unallocatedQuantity) {
    newSubmissionLines[newSubmissionLines.length - 1].quantity = (newSubmissionLines[newSubmissionLines.length - 1].quantity || 0) + unallocatedQuantity
  }
}

function _populateNewLines (returnsFrequency, versionId, existingSubmissionLines, newSubmissionLines) {
  const { readingType, userUnit } = existingSubmissionLines[0]

  for (const newSubmissionLine of newSubmissionLines) {
    newSubmissionLine.lineId = generateUUID()
    newSubmissionLine.quantity = null
    newSubmissionLine.readingType = readingType,
    newSubmissionLine.timePeriod = returnsFrequency
    newSubmissionLine.userUnit = userUnit
    newSubmissionLine.versionId = versionId

    const { endDate: newEndDate, startDate: newStartDate } = newSubmissionLine

    const matchingExistingSubmissionLines = existingSubmissionLines.filter((existingSubmissionLine) => {
      const existingEndDate = new Date(existingSubmissionLine.endDate)

      const datesMatch = existingEndDate >= newStartDate && existingEndDate <= newEndDate

      return datesMatch && !existingSubmissionLine.allocated
    })

    for (const matchingExistingLine of matchingExistingSubmissionLines) {
      matchingExistingLine.allocated = true

      // Quantity is a string when returned from the query. As such a '0' is not interpreted as falsy in JavaScript. If
      // it was an actual number, i.e. 0, then it _would_ be interpreted as falsy.
      if (matchingExistingLine.quantity) {
        // We don't default to zero in case there are no matching lines, in which case it should remain as NULL in the
        // DB. That means wwe have to handle the first time we add to our undefined quantity variable.
        newSubmissionLine.quantity = (newSubmissionLine.quantity || 0) + Number(matchingExistingLine.quantity)
      }
    }
  }
}

module.exports = {
  go
}
