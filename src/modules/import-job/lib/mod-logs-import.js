'use strict'

const ModLogsImportProcess = require('../../mod-logs-import/process.js')
const { currentTimeInNanoseconds, durations } = require('../../../lib/general.js')

const STEP_NAME = 'mod-logs-import'

async function go () {
  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: started`)

  const step = { logTime: new Date(), name: STEP_NAME }

  const startTime = currentTimeInNanoseconds()

  step.messages = await ModLogsImportProcess.go(false)

  const { timeTakenSs } = durations(startTime)

  step.duration = timeTakenSs

  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: completed`)

  return step
}

module.exports = {
  go
}
