'use strict'

const LicencesImportProcess = require('../../licences-import/process.js')

const LinkToModLogsJob = require('./link-to-mod-logs.js')

const JOB_NAME = 'import-job.licences-import'

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

    return await LicencesImportProcess.go(false)
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (messageQueue, job) {
  const state = job.data.failed ? 'failed' : 'completed'

  global.GlobalNotifier.omg(`${JOB_NAME}: ${state}`)

  await messageQueue.publish(LinkToModLogsJob.createMessage())
}

module.exports = {
  JOB_NAME,
  createMessage,
  handler,
  onComplete
}
