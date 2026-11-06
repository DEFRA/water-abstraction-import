'use strict'

const AlreadyRun = require('../../lib/services/already-run.js')
const FetchVoidReturnsLogsMissingSubmissions = require('./lib/fetch-void-return-logs-missing-submissions.js')
const ProcessVoidReturnLog = require('./lib/process-void-return-log.js')
const RecordRun = require('../../lib/services/record-run.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken, timestampForPostgres } = require('../../lib/general.js')

const STEP_NAME = 'missing-void-submissions'

async function go (log = false) {
  const messages = []

  let currentRegion

  try {
    const startTime = currentTimeInNanoseconds()

    const hasAlreadyRun = await AlreadyRun.go(STEP_NAME)

    if (hasAlreadyRun) {
      global.GlobalNotifier.omg(`${STEP_NAME}: skipped`)
      messages.push('Skipped because they have already been synced')

      return messages
    }

    const timestamp = timestampForPostgres()

    // Add the missing void return logs one region at a time
    const regions = ['1', '2', '3', '4', '5', '6', '7', '8']

    for (const region of regions) {
      currentRegion = region
      const voidReturnLogsMissingSubmissions = await FetchVoidReturnsLogsMissingSubmissions.go(region)

      for (const voidReturnLogMissingSubmission of voidReturnLogsMissingSubmissions) {
        const message = await ProcessVoidReturnLog.go(voidReturnLogMissingSubmission, timestamp)

        if (message) {
          messages.push(message)
        }
      }
    }

    await RecordRun.go(STEP_NAME)

    if (log) {
      calculateAndLogTimeTaken(startTime, `${STEP_NAME}: complete`, { messages })
    }
  } catch (error) {
    global.GlobalNotifier.omfg(`${STEP_NAME}: errored`, { currentRegion }, error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
