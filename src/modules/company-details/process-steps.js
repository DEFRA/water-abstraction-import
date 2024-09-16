'use strict'

const ImportStep = require('./steps/import.js')

const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../lib/general.js')

async function go () {
  let processComplete = false
  let counts = {}

  try {
    global.GlobalNotifier.omg('company-details started')

    const startTime = currentTimeInNanoseconds()

    counts = await ImportStep.go()

    processComplete = true

    calculateAndLogTimeTaken(startTime, 'company-details complete')
  } catch (error) {
    global.GlobalNotifier.oops('company-details failed')
  }

  return { processComplete, counts }
}

module.exports = {
  go
}
