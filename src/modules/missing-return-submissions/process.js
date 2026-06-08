'use strict'

const { currentTimeInNanoseconds, calculateAndLogTimeTaken, timestampForPostgres } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'missing-return-submissions: complete', { messages })
    }
  } catch (error) {
    global.GlobalNotifier.omfg('missing-return-submissions: errored', {}, error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
