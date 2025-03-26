'use strict'

const ExtractOldLinesProcess = require('../../extract-old-lines/process.js')

const CleanJob = require('./clean.js')

const config = require('../../../../config.js')

const JOB_NAME = 'import-job.extract-old-lines'

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

    await ExtractOldLinesProcess.go(config.featureFlags.disableReturnsImports, false)
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (messageQueue, job) {
  const state = job.data.failed ? 'failed' : 'completed'

  global.GlobalNotifier.omg(`${JOB_NAME}: ${state}`)

  await messageQueue.publish(CleanJob.createMessage())
}

module.exports = {
  JOB_NAME,
  createMessage,
  handler,
  onComplete
}
