'use strict'

const ExtractNaldDataProcess = require('../../extract-nald-data/process.js')

const ExtractOldLinesJob = require('./extract-old-lines.js')

const JOB_NAME = 'import-job.extract-nald-data'

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

    return await ExtractNaldDataProcess.go(false)
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (messageQueue, job) {
  const state = job.data.failed ? 'failed' : 'completed'

  global.GlobalNotifier.omg(`${JOB_NAME}: ${state}`)

  await messageQueue.publish(ExtractOldLinesJob.createMessage())
}

module.exports = {
  JOB_NAME,
  createMessage,
  handler,
  onComplete
}
