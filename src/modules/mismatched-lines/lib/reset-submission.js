'use strict'

const ResetSubmissionLines = require('./reset-submission-lines.js')
const ResetSubmissionMetadata = require('./reset-submission-metadata.js')
const db = require('../../../lib/connectors/db.js')

async function go (mismatchedReturnLog, versionId, needsAdjusting, newSubmissionLines, existingSubmissionLines, timestamp) {
  await db.transaction(async (query) => {
    await ResetSubmissionLines.go(query, newSubmissionLines, existingSubmissionLines, timestamp)

    // A return submitted using abstraction volumes can still have a meter, but won't have readings
    if (mismatchedReturnLog.metadata?.meters.length && mismatchedReturnLog.metadata?.meters[0]?.readings) {
      await ResetSubmissionMetadata.go(query, newSubmissionLines, versionId, mismatchedReturnLog.metadata, needsAdjusting, timestamp)
    }
  })
}

module.exports = {
  go
}
