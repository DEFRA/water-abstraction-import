'use strict'

const AlreadyRun = require('./lib/already-run.js')
const RecordRun = require('./lib/record-run.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  let currentRegion

  try {
    const startTime = currentTimeInNanoseconds()

    // Checking the end of period lines for mismatches between NALD and WRLS is an intensive process, even if none are
    // found. So, unlike previous one-off fixes, we literally only want this process to run once.
    //
    // We make use of a now defunct table. On the first run nothing will exist so the process will be allowed to
    // run. When finished we create a record in the table. On subsequent runs the record existing will cause the process
    // to be skipped.
    const hasAlreadyRun = await AlreadyRun.go()

    if (hasAlreadyRun) {
      global.GlobalNotifier.omg('sync-end-of-licence: skipped')
      messages.push('Skipped because they have already been synced')

      return messages
    }

    await RecordRun.go()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'sync-end-of-licence: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('sync-end-of-licence: errored', { currentRegion }, error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
