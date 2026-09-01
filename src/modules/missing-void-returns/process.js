'use strict'

const AlreadyRun = require('./lib/already-run.js')
const CreateVoidReturns = require('./lib/create-void-returns.js')
const RecordRun = require('./lib/record-run.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken, timestampForPostgres } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  let currentRegion

  try {
    const startTime = currentTimeInNanoseconds()

    const hasAlreadyRun = await AlreadyRun.go()

    if (hasAlreadyRun) {
      global.GlobalNotifier.omg('missing-void-returns: skipped')
      messages.push('Skipped because they have already been synced')

      return messages
    }

    const timestamp = timestampForPostgres()

    // Add the missing void return logs one region at a time
    const regions = ['1', '2', '3', '4', '5', '6', '7', '8']

    for (const region of regions) {
      currentRegion = region
      await CreateVoidReturns.go(region, timestamp)
    }

    await RecordRun.go()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'missing-void-returns: complete', { messages })
    }
  } catch (error) {
    global.GlobalNotifier.omfg('missing-void-returns: errored', { currentRegion }, error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
