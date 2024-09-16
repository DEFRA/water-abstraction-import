'use strict'

const ImportStep = require('./steps/import.js')

const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../lib/general.js')

async function go () {
  let processComplete = false

  try {
    global.GlobalNotifier.omg('mod-logs started')

    const startTime = currentTimeInNanoseconds()

    await ImportStep.go()

    processComplete = true

    calculateAndLogTimeTaken(startTime, 'mod-logs complete')
  } catch (error) {
    global.GlobalNotifier.oops('mod-logs failed')
  }

  return processComplete
}

module.exports = {
  go
}
