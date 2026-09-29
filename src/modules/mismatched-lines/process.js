'use strict'

const AlreadyRun = require('./lib/already-run.js')
const FetchMismatchedReturnLogs = require('./lib/fetch-mismatched-return-logs.js')
const FixMismatchedReturnLog = require('./lib/fix-mismatched-return-log.js')
const RecordRun = require('./lib/record-run.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken, timestampForPostgres } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  let mismatchedReturnLog

  try {
    const startTime = currentTimeInNanoseconds()

    const hasAlreadyRun = await AlreadyRun.go()

    if (hasAlreadyRun) {
      global.GlobalNotifier.omg('mismatched-lines: skipped')
      messages.push('Skipped because they have already been processed')

      return messages
    }

    const mismatchedReturnLogs = await FetchMismatchedReturnLogs.go()

    const timestamp = timestampForPostgres()

    for (let i = 0; i < mismatchedReturnLogs.length; i++) {
      mismatchedReturnLog = mismatchedReturnLogs[i]

      await FixMismatchedReturnLog.go(mismatchedReturnLog, timestamp)
    }

    await RecordRun.go()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'mismatched-lines: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('mismatched-lines: errored', { mismatchedReturnLog }, error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
