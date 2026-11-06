'use strict'

const AlreadyRun = require('../../lib/services/already-run.js')
const RecordRun = require('../../lib/services/record-run.js')
const SyncMismatchedQuantities = require('./lib/sync-mismatched-quantities.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

const STEP_NAME = 'sync-void-nald-lines'

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
    const hasAlreadyRun = await AlreadyRun.go(STEP_NAME)

    if (hasAlreadyRun) {
      global.GlobalNotifier.omg(`${STEP_NAME}: skipped`)
      messages.push('Skipped because they have already been synced')

      return messages
    }

    // Sync any mismatches between NALD and imported WRLS lines one region at a time
    const regions = ['1', '2', '3', '4', '5', '6', '7', '8']

    for (const region of regions) {
      currentRegion = region
      await SyncMismatchedQuantities.go(region)
    }

    await RecordRun.go(STEP_NAME)

    if (log) {
      calculateAndLogTimeTaken(startTime, `${STEP_NAME}: complete`)
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
