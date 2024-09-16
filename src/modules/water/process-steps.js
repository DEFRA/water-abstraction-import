'use strict'

const LicenceImportStep = require('./steps/licence-import.js')
const PointsImportStep = require('./steps/points-import.js')

const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../lib/general.js')

async function go () {
  let processComplete = false
  let licenceImportCounts = {}

  try {
    global.GlobalNotifier.omg('water started')

    const startTime = currentTimeInNanoseconds()

    licenceImportCounts = await LicenceImportStep.go()
    await PointsImportStep.go()

    processComplete = true

    calculateAndLogTimeTaken(startTime, 'water complete')
  } catch (error) {
    global.GlobalNotifier.oops('water failed')
  }

  return { processComplete, licenceImportCounts }
}

module.exports = {
  go
}
