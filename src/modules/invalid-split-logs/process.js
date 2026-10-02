'use strict'

const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'invalid-split-logs: complete', { messages })
    }
  } catch (error) {
    global.GlobalNotifier.omfg('invalid-split-logs: errored', {}, error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
