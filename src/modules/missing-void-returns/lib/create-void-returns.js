'use strict'

const CreateReturnLines = require('./create-return-lines.js')
const CreateReturnLog = require('./create-return-log.js')
const CreateReturnSubmission = require('./create-return-submission.js')
const FetchMissingVoidReturns = require('./fetch-missing-void-returns.js')

async function go (regionCode, timestamp) {
  const missingVoidReturns = await FetchMissingVoidReturns.go(regionCode)

  for (const missingVoidReturn of missingVoidReturns) {
    const returnLog = await CreateReturnLog.go(missingVoidReturn, timestamp)

    const returnSubmissionId = await CreateReturnSubmission.go(returnLog, timestamp)

    await CreateReturnLines.go(missingVoidReturn, returnSubmissionId, timestamp)
  }
}

module.exports = {
  go
}
