'use strict'

const ImportStep = require('./steps/import.js')

const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../lib/general.js')

async function go () {
  let processComplete = false

  try {
    global.GlobalNotifier.omg('permit-import started')

    const startTime = currentTimeInNanoseconds()

    await ImportStep.go()

    processComplete = true

    calculateAndLogTimeTaken(startTime, 'permit-import complete')
  } catch (error) {
    global.GlobalNotifier.oops('permit-import failed')
  }

  return processComplete
}

module.exports = {
  go
}
