'use strict'

const importService = require('../../../lib/services/import')
const populatePendingImportJob = require('./populate-pending-import')

const JOB_NAME = 'nald-import.delete-removed-documents'

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
    global.GlobalNotifier.omg('nald-import.delete-removed-documents: started')

    return importService.deleteRemovedDocuments()
  } catch (error) {
    global.GlobalNotifier.omfg('nald-import.delete-removed-documents: errored', error)
    throw error
  }
}

async function onComplete (messageQueue, job) {
  // Publish a new job to populate pending import table but only if delete removed documents was successful
  if (!job.failed) {
    await messageQueue.publish(populatePendingImportJob.createMessage())
  }

  global.GlobalNotifier.omg('nald-import.delete-removed-documents: finished')
}

module.exports = {
  createMessage,
  handler,
  onComplete,
  name: JOB_NAME
}
