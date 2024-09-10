'use strict'

const DownloadStep = require('./steps/download.js')
const ExtractStep = require('./steps/extract.js')
const ImportStep = require('./steps/import.js')
const SchemaStep = require('./steps/schema.js')
const SwapStep = require('./steps/swap.js')

const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../lib/general.js')

async function go () {
  let processComplete = false

  try {
    global.GlobalNotifier.omg('nald-data started')

    const startTime = currentTimeInNanoseconds()

    await DownloadStep.go()
    await ExtractStep.go()
    await SchemaStep.go()
    await ImportStep.go()
    await SwapStep.go()

    processComplete = true

    calculateAndLogTimeTaken(startTime, 'nald-data complete')
  } catch (error) {
    global.GlobalNotifier.oops('nald-data failed')
  }

  return processComplete
}

module.exports = {
  go
}
