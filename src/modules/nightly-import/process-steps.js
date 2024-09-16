'use strict'

const CleanProcessSteps = require('../clean/process-steps.js')
const CompanyDetailsProcessSteps = require('../company-details/process-steps.js')
const ModLogsProcessSteps = require('../mod-logs/process-steps.js')
const NaldDataProcessSteps = require('../nald-data/process-steps.js')
const PermitProcessSteps = require('../permit/process-steps.js')
const ReturnVersionsProcessSteps = require('../return-versions/process-steps.js')
const LicenceDetailsProcessSteps = require('../licence-details/process-steps.js')

const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../lib/general.js')

async function go () {
  let processComplete = false

  try {
    global.GlobalNotifier.omg('nightly-import started')

    const startTime = currentTimeInNanoseconds()

    await NaldDataProcessSteps.go()
    await CleanProcessSteps.go()
    await PermitProcessSteps.go()
    await CompanyDetailsProcessSteps.go()
    await LicenceDetailsProcessSteps.go()
    await ModLogsProcessSteps.go()
    await ReturnVersionsProcessSteps.go()
    await ModLogsProcessSteps.go()

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
