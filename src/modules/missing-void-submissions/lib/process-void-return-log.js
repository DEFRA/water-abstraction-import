'use strict'

const CreateReturnSubmission = require('./create-return-submission.js')
const CreateReturnSubmissionLines = require('./create-return-submission-lines.js')
const db = require('../../../lib/connectors/db.js')
const { generateUUID } = require('../../../lib/general.js')

async function go (voidReturnLog, timestamp) {
  let message

  const { returnLogId } = voidReturnLog

  try {
    const versionId = generateUUID()

    await db.transaction(async (query) => {
      await CreateReturnSubmission.go(query, versionId, voidReturnLog, timestamp)
      await CreateReturnSubmissionLines.go(query, versionId, voidReturnLog, timestamp)
    })
  } catch (error) {
    console.error(`Error: ${error.message}`, voidReturnLog, error)
    message = `Ret. log ${returnLogId} error: ${error.message}`
  }

  return message
}

module.exports = {
  go
}
