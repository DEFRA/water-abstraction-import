'use strict'

const db = require('../../lib/connectors/db.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'clean-return-logs: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('clean-return-logs: errored', {}, error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
