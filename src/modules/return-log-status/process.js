'use strict'

const { currentTimeInNanoseconds, calculateAndLogTimeTaken, timestampForPostgres } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'return-log-status: complete', { messages })
    }
  } catch (error) {
    global.GlobalNotifier.omfg('return-log-status: errored', {}, error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
