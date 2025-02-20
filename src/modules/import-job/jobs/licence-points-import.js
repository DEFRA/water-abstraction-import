'use strict'

const LicencePointsImportProcess = require('../../licence-points-import/process.js')

const LinkToModLogsJob = require('./link-to-mod-logs.js')

const JOB_NAME = 'import-job.link-to-mod-logs'

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

    await LicencePointsImportProcess.go(false)
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (messageQueue, job) {
  if (!job.data.failed) {
    await messageQueue.publish(LinkToModLogsJob.createMessage())

    global.GlobalNotifier.omg(`${JOB_NAME}: finished`)
  } else {
    global.GlobalNotifier.omg(`${JOB_NAME}: failed`)
  }
}

module.exports = {
  JOB_NAME,
  createMessage,
  handler,
  onComplete
}
