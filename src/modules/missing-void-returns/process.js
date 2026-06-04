'use strict'

const CollateMissingVoidReturnLines = require('./lib/collate-missing-void-return-lines.js')
const CreateMissingReturnLog = require('./lib/create-missing-return-log.js')
const FetchMissingVoidReturnLines = require('./lib/fetch-missing-void-return-lines.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken, timestampForPostgres } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    const missingVoidReturnLines = await FetchMissingVoidReturnLines.go()

    const collatedReturns = CollateMissingVoidReturnLines.go(missingVoidReturnLines)

    await _processMissingReturnLogs(collatedReturns)

    if (log) {
      calculateAndLogTimeTaken(startTime, 'missing-void-returns: complete', { messages })
    }
  } catch (error) {
    global.GlobalNotifier.omfg('missing-void-returns: errored', {}, error)

    messages.push(error.message)
  }

  return messages
}

async function _processMissingReturnLogs (collatedReturns) {
  const missingReturns = collatedReturns.filter((collatedReturn) => {
    return !collatedReturn.returnLog.id
  })

  const timestamp = timestampForPostgres()

  for (const missingReturn of missingReturns) {
    const { id, returnId } = await CreateMissingReturnLog.go(missingReturn, timestamp)

    missingReturn.returnLog.id = id
    missingReturn.returnLog.returnId = returnId
  }
}

module.exports = {
  go
}
