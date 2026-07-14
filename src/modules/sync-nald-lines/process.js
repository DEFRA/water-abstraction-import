'use strict'

const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'sync-nald-lines: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('sync-nald-lines: errored', {}, error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
