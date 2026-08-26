'use strict'

const AlreadyRun = require('./lib/already-run.js')
const RecordRun = require('./lib/record-run.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    const hasAlreadyRun = await AlreadyRun.go()

    if (hasAlreadyRun) {
      global.GlobalNotifier.omg('missing-void-returns: skipped')
      messages.push('Skipped because they have already been synced')

      return messages
    }

    await RecordRun.go()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'missing-void-returns: complete', { messages })
    }
  } catch (error) {
    global.GlobalNotifier.omfg('missing-void-returns: errored', {}, error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
