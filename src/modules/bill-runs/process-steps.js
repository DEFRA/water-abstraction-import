'use strict'

const ImportStep = require('./steps/import.js')

const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../lib/general.js')

async function go () {
  let processComplete = false

  try {
    global.GlobalNotifier.omg('bill-runs started')

    const startTime = currentTimeInNanoseconds()

    await ImportStep.go()

    processComplete = true

    calculateAndLogTimeTaken(startTime, 'bill-runs complete')
  } catch (error) {
    global.GlobalNotifier.oops('bill-runs failed')
  }

  return processComplete
}

module.exports = {
  go
}
