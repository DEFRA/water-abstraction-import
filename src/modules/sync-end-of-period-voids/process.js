'use strict'

const AlreadyRun = require('../../lib/services/already-run.js')
const RecordRun = require('../../lib/services/record-run.js')
const SyncEndOfPeriodVoids = require('./lib/sync-end-of-period-voids.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

const STEP_NAME = 'sync-end-of-period-voids'

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

    // Sync any mismatches between NALD and imported WRLS lines one region at a time
    const regions = ['1', '2', '3', '4', '5', '6', '7', '8']

    for (const region of regions) {
      currentRegion = region
      await SyncEndOfPeriodVoids.go(region)
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
