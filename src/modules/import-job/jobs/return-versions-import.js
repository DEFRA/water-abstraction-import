'use strict'

const ReturnVersionsImportProcess = require('../../return-versions-import/process.js')

const PartyCrmV2ImportJob = require('./party-crm-v2-import.js')

const config = require('../../../../config.js')

const JOB_NAME = 'import-job.return-versions-import'

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

    return await ReturnVersionsImportProcess.go(config.featureFlags.disableReturnsImports, false)
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (messageQueue, job) {
  const state = job.data.failed ? 'failed' : 'completed'

  global.GlobalNotifier.omg(`${JOB_NAME}: ${state}`)

  await messageQueue.publish(PartyCrmV2ImportJob.createMessage())
}

module.exports = {
  JOB_NAME,
  createMessage,
  handler,
  onComplete
}
