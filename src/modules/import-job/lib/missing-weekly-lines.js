'use strict'

const { currentTimeInNanoseconds, durations } = require('../../../lib/general.js')
const MissingWeeklyLines = require('../../missing-weekly-lines/process.js')

const STEP_NAME = 'missing-weekly-lines'

async function go () {
  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: started`)

  const step = { logTime: new Date(), name: STEP_NAME }

  const startTime = currentTimeInNanoseconds()

  step.messages = await MissingWeeklyLines.go(false)

  const { timeTakenSs } = durations(startTime)

  step.duration = timeTakenSs

  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: completed`)

  return step
}

module.exports = {
  go
}
