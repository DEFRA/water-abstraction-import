'use strict'

const AlreadyRun = require('./lib/already-run.js')
const FetchRequirementsWithInvalidSplitLogs = require('./lib/fetch-requirements-with-invalid-split-logs.js')
const ProcessInvalidSplitLog = require('./lib/process-invalid-split-log.js')
const RecordRun = require('./lib/record-run.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken, timestampForPostgres } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  let currentRegion

  try {
    const startTime = currentTimeInNanoseconds()

    const hasAlreadyRun = await AlreadyRun.go()

    // if (hasAlreadyRun) {
    //   global.GlobalNotifier.omg('invalid-split-logs: skipped')
    //   messages.push('Skipped because they have already been processed')

    //   return messages
    // }

    const timestamp = timestampForPostgres()

    // Add the missing void return logs one region at a time
    // const regions = ['1', '2', '3', '4', '5', '6', '7', '8']
    const regions = ['8']

    for (const region of regions) {
      currentRegion = region

      const requirementsWithInvalidSplitLogs = await FetchRequirementsWithInvalidSplitLogs.go(region)

      for (const requirementWithInvalidSplitLog of requirementsWithInvalidSplitLogs) {
        const errorMessage = await ProcessInvalidSplitLog.go(requirementWithInvalidSplitLog, timestamp)

        if (errorMessage) {
          messages.push(errorMessage)
        }
      }
    }

    // await RecordRun.go()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'invalid-split-logs: complete', { messages })
    }
  } catch (error) {
    global.GlobalNotifier.omfg('invalid-split-logs: errored', { currentRegion }, error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
