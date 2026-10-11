'use strict'

const { currentTimeInNanoseconds, durations } = require('../../../lib/general.js')
const MissingWeeklyReturns = require('../../missing-weekly-returns/process.js')

const STEP_NAME = 'missing-weekly-returns'

async function go () {
  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: started`)

  const step = { logTime: new Date(), name: STEP_NAME }

  const startTime = currentTimeInNanoseconds()

  step.messages = await MissingWeeklyReturns.go(false)

  const { timeTakenSs } = durations(startTime)

  step.duration = timeTakenSs

  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: completed`)

  return step
}

module.exports = {
  go
}
