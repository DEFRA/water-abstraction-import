'use strict'

const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'invalid-nil-returns: complete', { messages })
    }
  } catch (error) {
    global.GlobalNotifier.omfg('invalid-nil-returns: errored', {}, error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
