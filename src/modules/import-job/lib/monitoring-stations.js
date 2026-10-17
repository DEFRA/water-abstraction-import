'use strict'

const { currentTimeInNanoseconds, durations } = require('../../../lib/general.js')
const MonitoringStationsProcess = require('../../monitoring-stations/process.js')

const STEP_NAME = 'monitoring-stations'

async function go () {
  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: started`)

  const step = { logTime: new Date(), name: STEP_NAME }

  const startTime = currentTimeInNanoseconds()

  step.messages = await MonitoringStationsProcess.go(false)

  const { timeTakenSs } = durations(startTime)

  step.duration = timeTakenSs

  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: completed`)

  return step
}

module.exports = {
  go
}
