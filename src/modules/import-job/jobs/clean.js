'use strict'

const CleanProcess = require('../../clean/process.js')

const FlagDeletedDocumentsJob = require('./flag-deleted-documents.js')

const config = require('../../../../config.js')

const JOB_NAME = 'import-job.clean'

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

    return await CleanProcess.go(config.import.licences.isCleanLicenceImportsEnabled, false)
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (messageQueue, job) {
  const state = job.data.failed ? 'failed' : 'completed'

  global.GlobalNotifier.omg(`${JOB_NAME}: ${state}`)

  await messageQueue.publish(FlagDeletedDocumentsJob.createMessage())
}

module.exports = {
  JOB_NAME,
  createMessage,
  handler,
  onComplete
}
