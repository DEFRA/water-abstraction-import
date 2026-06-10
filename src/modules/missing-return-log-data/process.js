'use strict'

const { currentTimeInNanoseconds, calculateAndLogTimeTaken, timestampForPostgres } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    const timestamp = timestampForPostgres()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'missing-return-log-data: complete', { messages })
    }
  } catch (error) {
    global.GlobalNotifier.omfg('missing-return-log-data: errored', {}, error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
