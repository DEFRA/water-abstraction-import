'use strict'

const ImportStep = require('./steps/import.js')

const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../lib/general.js')

async function go () {
  let processComplete = false

  try {
    global.GlobalNotifier.omg('water started')

    const startTime = currentTimeInNanoseconds()

    await ImportStep.go()

    processComplete = true

    calculateAndLogTimeTaken(startTime, 'water complete')
  } catch (error) {
    global.GlobalNotifier.oops('water failed')
  }

  return processComplete
}

module.exports = {
  go
}
