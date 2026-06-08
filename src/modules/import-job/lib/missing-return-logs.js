'use strict'

const { currentTimeInNanoseconds, durations } = require('../../../lib/general.js')
const MissingReturnLogsProcess = require('../../missing-return-logs/process.js')

const STEP_NAME = 'missing-return-logs'

async function go () {
  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: started`)

  const step = { logTime: new Date(), name: STEP_NAME }

  const startTime = currentTimeInNanoseconds()

  step.messages = await MissingReturnLogsProcess.go(false)

  const { timeTakenSs } = durations(startTime)

  step.duration = timeTakenSs

  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: completed`)

  return step
}

module.exports = {
  go
}
