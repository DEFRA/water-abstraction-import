'use strict'

const { currentTimeInNanoseconds, durations } = require('../../../lib/general.js')
const SyncEndOfPeriodProcess = require('../../sync-end-of-period/process.js')

const STEP_NAME = 'sync-end-of-period'

async function go () {
  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: started`)

  const step = { logTime: new Date(), name: STEP_NAME }

  const startTime = currentTimeInNanoseconds()

  step.messages = await SyncEndOfPeriodProcess.go(false)

  const { timeTakenSs } = durations(startTime)

  step.duration = timeTakenSs

  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: completed`)

  return step
}

module.exports = {
  go
}
