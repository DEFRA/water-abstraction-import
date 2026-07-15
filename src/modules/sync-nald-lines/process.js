'use strict'

const AlreadyRun = require('./lib/already-run.js')
const RecordRun = require('./lib/record-run.js')
const RoundQuantities = require('./lib/round-quantities.js')
const SyncMismatchedQuantities = require('./lib/sync-mismatched-quantities.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  let currentRegion

  try {
    const startTime = currentTimeInNanoseconds()

    // Checking the lines for mismatches between NALD and WRLS is an intensive process, even if none are found. So,
    // unlike previous one-off fixes, we literally only want this process to run once.
    // So, we make use of a now defunct table. On the first run nothing will exist so the process will be allowed to
    // run. When finished we create a record in the table. On subsequent runs the record existing will cause the process
    // to be skipped.
    const hasAlreadyRun = await AlreadyRun.go()

    if (hasAlreadyRun) {
      global.GlobalNotifier.omg('sync-nald-lines: skipped')
      messages.push('Skipped because they have already been synced')

      return messages
    }

    // Rounding quantities to 6 decimal places fixes those previously imported that fell foul of JavaScript's issues
    // with floating point numbers. This will avoid them being flagged as a mismatch in the next step.
    await RoundQuantities.go()

    // Sync any mismatches between NALD and imported WRLS lines one region at a time
    const regions = ['1', '2', '3', '4', '5', '6', '7', '8']

    for (const region of regions) {
      currentRegion = region
      await SyncMismatchedQuantities.go(region)
    }

    await RecordRun.go()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'sync-nald-lines: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('sync-nald-lines: errored', { currentRegion }, error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
