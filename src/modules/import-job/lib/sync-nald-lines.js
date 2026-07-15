'use strict'

const { currentTimeInNanoseconds, durations } = require('../../../lib/general.js')
const SyncNaldLinesProcess = require('../../sync-nald-lines/process.js')

const STEP_NAME = 'sync-nald-lines'

async function go () {
  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: started`)

  const step = { logTime: new Date(), name: STEP_NAME }

  const startTime = currentTimeInNanoseconds()

  step.messages = await SyncNaldLinesProcess.go(false)

  const { timeTakenSs } = durations(startTime)

  step.duration = timeTakenSs

  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: completed`)

  return step
}

module.exports = {
  go
}
