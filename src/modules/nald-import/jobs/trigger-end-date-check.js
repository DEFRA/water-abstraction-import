'use strict'

const DeleteRemovedDocumentsJob = require('./delete-removed-documents.js')
const WaterSystemService = require('../../../lib/services/water-system-service.js')

const JOB_NAME = 'nald-import.trigger-end-date-check'

function createMessage () {
  return {
    name: JOB_NAME,
    options: {
      expireIn: '1 hours',
      singletonKey: JOB_NAME
    }
  }
}

async function handler () {
  try {
    global.GlobalNotifier.omg(`${JOB_NAME}: started`)

    await WaterSystemService.postLicencesEndDatesCheck()
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (messageQueue, job) {
  if (!job.failed) {
    // Publish a new job to delete any removed documents
    await messageQueue.publish(DeleteRemovedDocumentsJob.createMessage())
  }

  global.GlobalNotifier.omg(`${JOB_NAME}: finished`)
}

module.exports = {
  createMessage,
  handler,
  onComplete,
  name: JOB_NAME
}
