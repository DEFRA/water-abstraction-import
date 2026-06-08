'use strict'

const { currentTimeInNanoseconds, durations } = require('../../../lib/general.js')
const ReturnLogStatusProcess = require('../../return-log-status/process.js')

const STEP_NAME = 'return-log-status'

async function go () {
  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: started`)

  const step = { logTime: new Date(), name: STEP_NAME }

  const startTime = currentTimeInNanoseconds()

  step.messages = await ReturnLogStatusProcess.go(false)

  const { timeTakenSs } = durations(startTime)

  step.duration = timeTakenSs

  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: completed`)

  return step
}

module.exports = {
  go
}
