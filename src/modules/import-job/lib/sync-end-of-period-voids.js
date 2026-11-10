'use strict'

const { currentTimeInNanoseconds, durations } = require('../../../lib/general.js')
const SyncEndOfPeriodVoidsProcess = require('../../sync-end-of-period-voids/process.js')

const STEP_NAME = 'sync-end-of-period-voids'

async function go () {
  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: started`)

  const step = { logTime: new Date(), name: STEP_NAME }

  const startTime = currentTimeInNanoseconds()

  step.messages = await SyncEndOfPeriodVoidsProcess.go(false)

  const { timeTakenSs } = durations(startTime)

  step.duration = timeTakenSs

  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: completed`)

  return step
}

module.exports = {
  go
}
