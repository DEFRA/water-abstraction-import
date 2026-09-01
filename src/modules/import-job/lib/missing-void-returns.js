'use strict'

const { currentTimeInNanoseconds, durations } = require('../../../lib/general.js')
const MissingVoidReturnsProcess = require('../../missing-void-returns/process.js')

const STEP_NAME = 'missing-void-returns'

async function go () {
  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: started`)

  const step = { logTime: new Date(), name: STEP_NAME }

  const startTime = currentTimeInNanoseconds()

  step.messages = await MissingVoidReturnsProcess.go(false)

  const { timeTakenSs } = durations(startTime)

  step.duration = timeTakenSs

  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: completed`)

  return step
}

module.exports = {
  go
}
