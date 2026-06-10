'use strict'

const { currentTimeInNanoseconds, durations } = require('../../../lib/general.js')
const MissingReturnLogDataProcess = require('../..//missing-return-log-data/process.js')

const STEP_NAME = 'missing-return-log-data'

async function go () {
  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: started`)

  const step = { logTime: new Date(), name: STEP_NAME }

  const startTime = currentTimeInNanoseconds()

  step.messages = await MissingReturnLogDataProcess.go(false)

  const { timeTakenSs } = durations(startTime)

  step.duration = timeTakenSs

  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: completed`)

  return step
}

module.exports = {
  go
}
