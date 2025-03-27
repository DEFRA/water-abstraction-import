'use strict'

const { currentTimeInNanoseconds, durations } = require('../../../lib/general.js')
const ReturnVersionsImportProcess = require('../../return-versions-import/process.js')

const config = require('../../../../config.js')

const STEP_NAME = 'return-versions-import'

async function go () {
  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: started`)

  const step = { logTime: new Date(), name: STEP_NAME }

  const startTime = currentTimeInNanoseconds()

  step.messages = await ReturnVersionsImportProcess.go(config.featureFlags.disableReturnsImports, false)

  const { timeTakenSs } = durations(startTime)

  step.duration = timeTakenSs

  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: completed`)

  return step
}

module.exports = {
  go
}
