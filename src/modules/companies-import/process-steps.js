'use strict'

const ImportStep = require('./steps/import.js')

const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../lib/general.js')

async function go () {
  let processComplete = false

  try {
    global.GlobalNotifier.omg('companies-import started')

    const startTime = currentTimeInNanoseconds()

    await ImportStep.go()

    processComplete = true

    calculateAndLogTimeTaken(startTime, 'companies-import complete')
  } catch (error) {
    global.GlobalNotifier.oops('companies-import failed')
  }

  return processComplete
}

module.exports = {
  go
}
