'use strict'

const CleanProcessSteps = require('../clean/process-steps.js')
const CompaniesImportProcessSteps = require('../companies-import/process-steps.js')
const NaldDataProcessSteps = require('../nald-data/process-steps.js')
const PermitImportProcessSteps = require('../permit-import/process-steps.js')
const ReturnVersionsProcessSteps = require('../return-versions/process-steps.js')

const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../lib/general.js')

async function go () {
  let processComplete = false

  try {
    global.GlobalNotifier.omg('nightly-import started')

    const startTime = currentTimeInNanoseconds()

    await NaldDataProcessSteps.go()
    await CleanProcessSteps.go()
    await PermitImportProcessSteps.go()
    await CompaniesImportProcessSteps.go()
    await ReturnVersionsProcessSteps.go()

    processComplete = true

    calculateAndLogTimeTaken(startTime, 'nightly-import complete')
  } catch (error) {
    global.GlobalNotifier.oops('nightly-import failed')
  }

  return processComplete
}

module.exports = {
  go
}
