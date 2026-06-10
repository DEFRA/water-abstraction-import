'use strict'

const CollateReturnLogsMissingSubmission = require('./lib/collate-return-logs-missing-submission.js')
const CreateMissingReturnSubmission = require('./lib/create-missing-return-submission.js')
const FetchReturnLogsMissingSubmission = require('./lib/fetch-return-logs-missing-submissions.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken, timestampForPostgres } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    const returnLogsMissingSubmission = await FetchReturnLogsMissingSubmission.go()
    const collatedReturnLogs = CollateReturnLogsMissingSubmission.go(returnLogsMissingSubmission)

    const timestamp = timestampForPostgres()

    await _creatingMissingReturnSubmissions(collatedReturnLogs, timestamp)

    if (log) {
      calculateAndLogTimeTaken(startTime, 'missing-return-submissions: complete', { messages })
    }
  } catch (error) {
    global.GlobalNotifier.omfg('missing-return-submissions: errored', {}, error)

    messages.push(error.message)
  }

  return messages
}

async function _creatingMissingReturnSubmissions (collatedReturnLogs, timestamp) {
  for (const collatedReturnLog of collatedReturnLogs) {
    await CreateMissingReturnSubmission.go(collatedReturnLog, timestamp)
  }
}

module.exports = {
  go
}
