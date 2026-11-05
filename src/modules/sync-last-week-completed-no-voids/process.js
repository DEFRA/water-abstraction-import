'use strict'

const AlreadyRun = require('../../lib/services/already-run.js')
const RecordRun = require('../../lib/services/record-run.js')
const SyncLastWeekCompletedNoVoids = require('./lib/sync-last-week-completed-no-voids.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  let currentRegion

  try {
    const startTime = currentTimeInNanoseconds()

    const hasAlreadyRun = await AlreadyRun.go('sync-last-week-completed-no-voids')

    if (hasAlreadyRun) {
      global.GlobalNotifier.omg('sync-last-week-completed-no-voids: skipped')
      messages.push('Skipped because they have already been synced')

      return messages
    }

    // Sync any mismatches between NALD and imported WRLS lines one region at a time
    const regions = ['1', '2', '3', '4', '5', '6', '7', '8']

    for (const region of regions) {
      currentRegion = region
      await SyncLastWeekCompletedNoVoids.go(region)
    }

    await RecordRun.go('sync-last-week-completed-no-voids')

    if (log) {
      calculateAndLogTimeTaken(startTime, 'sync-last-week-completed-no-voids: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('sync-last-week-completed-no-voids: errored', { currentRegion }, error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
