'use strict'

const { currentTimeInNanoseconds, durations } = require('../../../lib/general.js')
const ExtractOldLinesProcess = require('../../extract-old-lines/process.js')

const config = require('../../../../config.js')

const STEP_NAME = 'extract-old-lines'

async function go () {
  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: started`)

  const step = { logTime: new Date(), name: STEP_NAME }

  const startTime = currentTimeInNanoseconds()

  step.messages = await ExtractOldLinesProcess.go(config.featureFlags.disableReturnsImports, false)

  const { timeTakenSs } = durations(startTime)

  step.duration = timeTakenSs

  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: completed`)

  return step
}

module.exports = {
  go
}
