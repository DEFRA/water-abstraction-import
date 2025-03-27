'use strict'

const { currentTimeInNanoseconds, durations } = require('../../../lib/general.js')
const ExtractNaldDataProcess = require('../../extract-nald-data/process.js')

const STEP_NAME = 'extract-nald-data'

async function go () {
  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: started`)

  const step = { logTime: new Date(), name: STEP_NAME }

  const startTime = currentTimeInNanoseconds()

  step.messages = await ExtractNaldDataProcess.go()

  const { timeTakenSs } = durations(startTime)

  step.duration = timeTakenSs

  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: completed`)

  return step
}

module.exports = {
  go
}
