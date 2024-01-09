'use strict'

const importService = require('../../../lib/services/import')
const QueueLicencesJob = require('./queue-licences')

const JOB_NAME = 'nald-import.delete-removed-documents'

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

    return importService.deleteRemovedDocuments()
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (messageQueue, job) {
  // Publish a new job to populate pending import table but only if delete removed documents was successful
  if (!job.failed) {
    await messageQueue.publish(QueueLicencesJob.createMessage())
  }

  global.GlobalNotifier.omg(`${JOB_NAME}: finished`)
}

module.exports = {
  createMessage,
  handler,
  onComplete,
  name: JOB_NAME
}
