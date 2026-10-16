'use strict'

const AlreadyRun = require('./lib/already-run.js')
const RecordRun = require('./lib/record-run.js')
const SyncFirstWeekVoidLines = require('./lib/sync-first-week-void-lines.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  let currentRegion

  try {
    const startTime = currentTimeInNanoseconds()

    const hasAlreadyRun = await AlreadyRun.go()

    if (hasAlreadyRun) {
      global.GlobalNotifier.omg('sync-first-week-voids: skipped')
      messages.push('Skipped because they have already been synced')

      return messages
    }

    // Sync any mismatches between NALD and imported WRLS lines one region at a time
    const regions = ['1', '2', '3', '4', '5', '6', '7', '8']

    for (const region of regions) {
      currentRegion = region
      await SyncFirstWeekVoidLines.go(region)
    }

    await RecordRun.go()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'sync-first-week-voids: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('sync-first-week-voids: errored', { currentRegion }, error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
