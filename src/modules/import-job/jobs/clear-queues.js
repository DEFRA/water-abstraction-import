'use strict'

const ClearQueuesProcess = require('../../clear-queues/process.js')

const ExtractNaldDataJob = require('./extract-nald-data.js')

// TODO: Delete me!
const CleanJob = require('./clean.js')
// const CompanyImportJob = require('./crm-v2-import.js')
// const LicenceImportJob = require('./licence-data-import.js')

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
  const state = job.data.failed ? 'failed' : 'completed'

  global.GlobalNotifier.omg(`${JOB_NAME}: ${state}`)

  // await messageQueue.publish(ExtractNaldDataJob.createMessage())
  // await messageQueue.publish(CompanyImportJob.createMessage())
  // await messageQueue.publish(LicenceImportJob.createMessage())
  await messageQueue.publish(CleanJob.createMessage())
}

module.exports = {
  JOB_NAME,
  createMessage,
  handler,
  onComplete
}
