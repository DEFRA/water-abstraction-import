'use strict'

const { currentTimeInNanoseconds, durations } = require('../../../lib/general.js')
const InvalidNilReturnsProcess = require('../../invalid-nil-returns/process.js')

const STEP_NAME = 'invalid-nil-returns'

async function go () {
  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: started`)

  const step = { logTime: new Date(), name: STEP_NAME }

  const startTime = currentTimeInNanoseconds()

  step.messages = await InvalidNilReturnsProcess.go(false)

  const { timeTakenSs } = durations(startTime)

  step.duration = timeTakenSs

  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: completed`)

  return step
}

module.exports = {
  go
}
