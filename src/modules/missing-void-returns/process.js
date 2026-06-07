'use strict'

const CollateMissingVoidReturnLines = require('./lib/collate-missing-void-return-lines.js')
const CreateMissingReturnLines = require('./lib/create-missing-return-lines.js')
const CreateMissingReturnLog = require('./lib/create-missing-return-log.js')
const CreateMissingReturnSubmission = require('./lib/create-missing-return-submission.js')
const FetchMissingVoidReturnLines = require('./lib/fetch-missing-void-return-lines.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken, timestampForPostgres } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    const missingVoidReturnLines = await FetchMissingVoidReturnLines.go()

    const collatedReturns = CollateMissingVoidReturnLines.go(missingVoidReturnLines)

    const timestamp = timestampForPostgres()

    await _createMissingReturnLogs(collatedReturns, timestamp)

    await _processReturns(collatedReturns, timestamp)

    if (log) {
      calculateAndLogTimeTaken(startTime, 'missing-void-returns: complete', { messages })
    }
  } catch (error) {
    global.GlobalNotifier.omfg('missing-void-returns: errored', {}, error)

    messages.push(error.message)
  }

  return messages
}

async function _createMissingReturnLogs (collatedReturns, timestamp) {
  const missingReturns = collatedReturns.filter((collatedReturn) => {
    return !collatedReturn.returnLog.id
  })

  for (const missingReturn of missingReturns) {
    const { id, returnId } = await CreateMissingReturnLog.go(missingReturn, timestamp)

    missingReturn.returnLog.id = id
    missingReturn.returnLog.returnId = returnId
  }
}

async function _processReturns (collatedReturns, timestamp) {
  for (const collatedReturn of collatedReturns) {
    collatedReturn.versionId = await CreateMissingReturnSubmission.go(collatedReturn.returnLog, timestamp)

    await CreateMissingReturnLines.go(collatedReturn, timestamp)
  }
}

module.exports = {
  go
}
