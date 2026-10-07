'use strict'

const AlreadyRun = require('./lib/already-run.js')
const RecordRun = require('./lib/record-run.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    // Checking for missing lines is an intensive process, even if none are found. So, unlike previous one-off fixes, we
    // literally only want this process to run once. So, we make use of a now defunct table. On the first run nothing
    // will exist so the process will be allowed to run. When finished we create a record in the table. On subsequent
    // runs the record existing will cause the process to be skipped.
    const hasAlreadyRun = await AlreadyRun.go()

    if (hasAlreadyRun) {
      global.GlobalNotifier.omg('sync-nald-lines: skipped')
      messages.push('Skipped because they have already been synced')

      return messages
    }

    await RecordRun.go()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'missing-lines: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('missing-lines: errored', {}, error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
