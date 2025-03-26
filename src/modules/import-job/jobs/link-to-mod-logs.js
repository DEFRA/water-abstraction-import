'use strict'

const LinkToModLogsProcess = require('../../link-to-mod-logs/process.js')

const EndDateTriggerJob = require('./end-date-trigger.js')

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

    return await LinkToModLogsProcess.go(false)
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (messageQueue, job) {
  const state = job.data.failed ? 'failed' : 'completed'

  global.GlobalNotifier.omg(`${JOB_NAME}: ${state}`)

  await messageQueue.publish(EndDateTriggerJob.createMessage())
}

module.exports = {
  JOB_NAME,
  createMessage,
  handler,
  onComplete
}
