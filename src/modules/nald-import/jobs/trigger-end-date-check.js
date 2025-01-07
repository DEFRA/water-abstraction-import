'use strict'

const DeleteRemovedDocumentsJob = require('./delete-removed-documents.js')
const WaterSystemService = require('../../../lib/services/water-system-service.js')

const JOB_NAME = 'nald-import.trigger-end-date-check'

function createMessage (replicateReturns) {
  return {
    name: JOB_NAME,
    options: {
      expireIn: '1 hours',
      singletonKey: JOB_NAME
    },
    data: {
      replicateReturns
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
    const { replicateReturns } = job.data.request.data

    // Publish a new job to delete any removed documents
    await messageQueue.publish(DeleteRemovedDocumentsJob.createMessage(replicateReturns))
  }

  global.GlobalNotifier.omg(`${JOB_NAME}: finished`)
}

module.exports = {
  createMessage,
  handler,
  onComplete,
  name: JOB_NAME
}
