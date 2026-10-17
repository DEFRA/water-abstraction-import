'use strict'

const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'monitoring-stations: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('monitoring-stations: errored', {}, error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
