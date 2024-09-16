'use strict'

const LicenceImportStep = require('./steps/licence-import.js')
const PointsImportStep = require('./steps/points-import.js')

const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../lib/general.js')

async function go () {
  let processComplete = false
  let counts = {}

  try {
    global.GlobalNotifier.omg('water started')

    const startTime = currentTimeInNanoseconds()

    counts = await LicenceImportStep.go()
    await PointsImportStep.go()

    processComplete = true

    calculateAndLogTimeTaken(startTime, 'water complete')
  } catch (error) {
    global.GlobalNotifier.oops('water failed')
  }

  return { processComplete, counts }
}

module.exports = {
  go
}
