'use strict'

const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  let currentRegion

  try {
    const startTime = currentTimeInNanoseconds()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'sync-end-of-licence: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('sync-end-of-licence: errored', { currentRegion }, error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
