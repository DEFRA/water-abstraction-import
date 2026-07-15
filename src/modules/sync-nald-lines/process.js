'use strict'

const RoundQuantities = require('./lib/round-quantities.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    // Rounding quantities to 6 decimal places fixes those previously imported that fell foul of JavaScript's issues
    // with floating point numbers. This will avoid them being flagged as a mismatch in the next step.
    await RoundQuantities.go()

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
