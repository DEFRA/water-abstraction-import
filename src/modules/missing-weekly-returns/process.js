'use strict'

const AlreadyRun = require('./lib/already-run.js')
const FetchReturnsMissingSubmissions = require('./lib/fetch-returns-missing-submissions.js')
const ProcessReturnMissingSubmission = require('./lib/process-return-missing-submission.js')
const RecordRun = require('./lib/record-run.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken, timestampForPostgres } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  let currentRegion

  try {
    const startTime = currentTimeInNanoseconds()

    const hasAlreadyRun = await AlreadyRun.go()

    if (hasAlreadyRun) {
      global.GlobalNotifier.omg('missing-weekly-returns: skipped')
      messages.push('Skipped because they have already been synced')

      return messages
    // }

    const timestamp = timestampForPostgres()

    // Check for missing submission lines one region at a time
    const regions = ['1', '2', '3', '4', '5', '6', '7', '8']

    for (const region of regions) {
      currentRegion = region

      const returnsMissingSubmissions = await FetchReturnsMissingSubmissions.go(region)

      for (const returnMissingSubmission of returnsMissingSubmissions) {
        const message = await ProcessReturnMissingSubmission.go(returnMissingSubmission, timestamp)

        if (message) {
          messages.push(message)
        }
      }
    }

    await RecordRun.go()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'missing-weekly-returns: complete', { messages })
    }
  } catch (error) {
    global.GlobalNotifier.omfg('missing-weekly-returns: errored', { currentRegion }, error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
