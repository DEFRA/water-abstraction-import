'use strict'

const EndDateCheckProcess = require('../../end-date-check/process.js')

const ReferenceDataImportJob = require('./reference-data-import.js')

const JOB_NAME = 'import-job.end-date-check'

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

    return await EndDateCheckProcess.go(false)
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (messageQueue, job) {
  const state = job.data.failed ? 'failed' : 'completed'

  global.GlobalNotifier.omg(`${JOB_NAME}: ${state}`)

  await messageQueue.publish(ReferenceDataImportJob.createMessage())
}

module.exports = {
  JOB_NAME,
  createMessage,
  handler,
  onComplete
}
