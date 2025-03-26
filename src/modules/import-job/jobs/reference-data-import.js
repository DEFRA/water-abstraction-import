'use strict'

const ReferenceDataImportProcess = require('../../reference-data-import/process.js')

const ReturnVersionsImportJob = require('./return-versions-import.js')

const JOB_NAME = 'import-job.reference-data-import'

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

    return await ReferenceDataImportProcess.go(false)
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (messageQueue, job) {
  const state = job.data.failed ? 'failed' : 'completed'

  global.GlobalNotifier.omg(`${JOB_NAME}: ${state}`)

  await messageQueue.publish(ReturnVersionsImportJob.createMessage())
}

module.exports = {
  JOB_NAME,
  createMessage,
  handler,
  onComplete
}
