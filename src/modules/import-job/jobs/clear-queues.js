'use strict'

const ClearQueuesProcess = require('../../clear-queues/process.js')

const ExtractNaldDataJob = require('./extract-nald-data.js')

// TODO: Delete me!
const CleanJob = require('./clean.js')

const JOB_NAME = 'import-job.clear-queues'

function createMessage () {
  return {
    name: JOB_NAME,
    options: {
      singletonKey: JOB_NAME
    }
  }
}

async function handler (messageQueue) {
  try {
    global.GlobalNotifier.omg(`${JOB_NAME}: started`)

    await ClearQueuesProcess.go(messageQueue, false)
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (messageQueue, job) {
  if (!job.failed) {
    // await messageQueue.publish(ExtractNaldDataJob.createMessage())

    await messageQueue.publish(CleanJob.createMessage())

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
