'use strict'

const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../lib/general.js')

async function go () {
  let processComplete = false

  try {
    global.GlobalNotifier.omg('water-import started')

    const startTime = currentTimeInNanoseconds()

    processComplete = true

    calculateAndLogTimeTaken(startTime, 'water-import complete')
  } catch (error) {
    global.GlobalNotifier.oops('water-import failed')
  }

  return processComplete
}

module.exports = {
  go
}
