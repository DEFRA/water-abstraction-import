'use strict'

const AdjustForMonthlyToWeekly = require('./adjust-for-monthly-to-weekly.js')
const db = require('../../../lib/connectors/db.js')
const { formatDateObjectToISO } = require('../../../lib/date-helpers.js')

async function go (newSubmissionLines, versionId, existingMetadata, needsAdjusting, timestamp) {
  const existingReadings = _existingReadings(existingMetadata)

  if (needsAdjusting) {
    AdjustForMonthlyToWeekly.go(existingReadings)
  }

  _populateNewReadings(newSubmissionLines, existingReadings)

  const newMetadata = { ...existingMetadata }

  newMetadata.meters[0].readings = _convertToMetadataReadings(newSubmissionLines)

  await _updateMetadata(newMetadata, timestamp, versionId)
}

function _convertToMetadataReadings (newSubmissionLines) {
  return newSubmissionLines.reduce((acc, line) => {
    const { startDate, endDate, reading } = line

    const key = `${formatDateObjectToISO(new Date(startDate))}_${formatDateObjectToISO(new Date(endDate))}`
    acc[key] = reading

    return acc
  }, {})
}

function _existingReadings (existingMetadata) {
  const { readings } = existingMetadata.meters[0]

  return Object.entries(readings).map((reading) => {
    const [key, value] = reading
    const keyDates = key.split('_')

    return {
      allocated: false,
      endDate: new Date(keyDates[1]),
      startDate: new Date(keyDates[0]),
      value
    }
  })
}

function _populateNewReadings (newSubmissionLines, existingReadings) {
  for (const newSubmissionLine of newSubmissionLines) {
    const { endDate: newEndDate, startDate: newStartDate } = newSubmissionLine

    newSubmissionLine.reading = null

    const matchingReadings = existingReadings.filter((existingReading) => {
      const existingEndDate = existingReading.endDate

      const datesMatch = existingEndDate >= newStartDate && existingEndDate <= newEndDate

      return datesMatch && !existingReading.allocated
    })

    // Once a reading has been matched to a new line, we mark it as allocated to prevent it from being allocated to
    // another line later on
    for (const matchingReading of matchingReadings) {
      matchingReading.allocated = true
    }

    // If converting from weekly to monthly, for example, we want the last matching reading _that has a value_. We
    // found you cannot assume that the last entry is the one that has a value, so can't just use length - 1.
    const lastReadingWithValue = matchingReadings.findLast((matchingReading) => {
      return matchingReading.value !== null
    })

    if (lastReadingWithValue) {
      newSubmissionLine.reading = lastReadingWithValue.value
    }
  }
}

async function _updateMetadata (metadata, timestamp, versionId) {
  const params = [metadata, timestamp, versionId]
  const query = `UPDATE "returns".versions v
SET
  metadata = $1,
  updated_at = $2
WHERE
  v.version_id = $3;`

  await db.query(query, params)
}

module.exports = {
  go
}
