'use strict'

const AlreadyRun = require('./lib/already-run.js')
const FetchInvalidNilReturns = require('./lib/fetch-invalid-nil-returns.js')
const ProcessInvalidNilReturn = require('./lib/process-invalid-nil-return.js')
const RecordRun = require('./lib/record-run.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken, timestampForPostgres } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  let currentRegion

  try {
    const startTime = currentTimeInNanoseconds()

    const hasAlreadyRun = await AlreadyRun.go()

    if (hasAlreadyRun) {
      global.GlobalNotifier.omg('invalid-nil-returns: skipped')
      messages.push('Skipped because they have already been synced')

      return messages
    }

    const timestamp = timestampForPostgres()

    const regions = ['1', '2', '3', '4', '5', '6', '7', '8']

    for (const region of regions) {
      currentRegion = region

      const invalidNilReturns = await FetchInvalidNilReturns.go(region)

      for (const invalidNilReturn of invalidNilReturns) {
        const errorMessage = await ProcessInvalidNilReturn.go(invalidNilReturn, timestamp)

        if (errorMessage) {
          messages.push(errorMessage)
        }
      }
    }

    await RecordRun.go()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'invalid-nil-returns: complete', { messages })
    }
  } catch (error) {
    global.GlobalNotifier.omfg('invalid-nil-returns: errored', { currentRegion }, error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
