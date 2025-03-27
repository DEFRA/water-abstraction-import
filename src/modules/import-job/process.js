'use strict'

const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')
const CleanStep = require('./lib/clean.js')
const CompletionEmail = require('../completion-email/process.js')
const EndDateCheckStep = require('./lib/end-date-check.js')
const EndDateTriggerStep = require('./lib/end-date-trigger.js')
const ExtractNaldDataStep = require('./lib/extract-nald-data.js')
const ExtractOldLinesStep = require('./lib/extract-old-lines.js')
const FlagDeletedDocumentsStep = require('./lib/flag-deleted-documents.js')
const LicenceDataImportStep = require('./lib/licence-data-import.js')
const LicencesImportStep = require('./lib/licences-import.js')
const LinkToModLogsStep = require('./lib/link-to-mod-logs.js')
const PartyCrmV2ImportStep = require('./lib/party-crm-v2-import.js')
const ReferenceDataImportStep = require('./lib/reference-data-import.js')
const ReturnVersionsImport = require('./lib/return-versions-import.js')

async function go () {
  const steps = []

  let step

  try {
    const startTime = currentTimeInNanoseconds()

    global.GlobalNotifier.omg('import-job started')

    step = await ExtractNaldDataStep.go()
    steps.push(step)

    step = await ExtractOldLinesStep.go()
    steps.push(step)

    step = await CleanStep.go()
    steps.push(step)

    step = await FlagDeletedDocumentsStep.go()
    steps.push(step)

    step = await EndDateCheckStep.go()
    steps.push(step)

    step = await ReferenceDataImportStep.go()
    steps.push(step)

    step = await ReturnVersionsImport.go()
    steps.push(step)

    step = await PartyCrmV2ImportStep.go()
    steps.push(step)

    step = await LicenceDataImportStep.go()
    steps.push(step)

    step = await LicencesImportStep.go()
    steps.push(step)

    step = await LinkToModLogsStep.go()
    steps.push(step)

    step = await EndDateTriggerStep.go()
    steps.push(step)

    calculateAndLogTimeTaken(startTime, 'import-job completed')
  } catch (error) {
    global.GlobalNotifier.omfg('import-job errored', error)

    messages.push(error.message)
  }

  await CompletionEmail.go(steps)
}

module.exports = {
  go
}
