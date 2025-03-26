'use strict'

const ImportJobEmailProcess = require('../../completion-email/process.js')

const JOB_NAME = 'import-job.completion-email'

function createMessage () {
  return {
    name: JOB_NAME,
    options: {
      singletonKey: JOB_NAME
    }
  }
}

async function handler () {
  try {
    global.GlobalNotifier.omg(`${JOB_NAME}: started`)

    await ImportJobEmailProcess.go(false)
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (job) {
  const state = job.data.failed ? 'failed' : 'completed'

  global.GlobalNotifier.omg(`${JOB_NAME}: ${state}`)
}

module.exports = {
  JOB_NAME,
  createMessage,
  handler,
  onComplete
}
