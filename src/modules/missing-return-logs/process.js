'use strict'

const CollateMissingReturnLogs = require('./lib/collate-missing-return-logs.js')
const CreateMissingReturnLogs = require('./lib/create-missing-return-logs.js')
const FetchMissingReturnLogs = require('./lib/fetch-missing-return-logs.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken, timestampForPostgres } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    const missingReturnLogs = await FetchMissingReturnLogs.go()

    const collatedMissingReturnLogs = CollateMissingReturnLogs.go(missingReturnLogs)

    const timestamp = timestampForPostgres()

    await _createMissingReturnLogs(collatedMissingReturnLogs, timestamp)

    if (log) {
      calculateAndLogTimeTaken(startTime, 'missing-return-logs: complete', { messages })
    }
  } catch (error) {
    global.GlobalNotifier.omfg('missing-return-logs: errored', {}, error)

    messages.push(error.message)
  }

  return messages
}

async function _createMissingReturnLogs (collatedMissingReturnLogs, timestamp) {
  for (const collatedMissingReturnLog of collatedMissingReturnLogs) {
    await CreateMissingReturnLogs.go(collatedMissingReturnLog, timestamp)
  }
}

module.exports = {
  go
}
