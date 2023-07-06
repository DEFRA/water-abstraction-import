'use strict'

const documentsConnector = require('../connectors/documents')
const ImportPurposeConditionTypesJob = require('./import-purpose-condition-types.js')

const JOB_NAME = 'import.delete-documents'

function createMessage () {
  return {
    name: JOB_NAME,
    options: {
      singletonKey: JOB_NAME,
      expireIn: '1 hours'
    }
  }
}

async function handler () {
  try {
    global.GlobalNotifier.omg('import.delete-documents: started')

    return documentsConnector.deleteRemovedDocuments()
  } catch (error) {
    global.GlobalNotifier.omfg('import.delete-documents: errored', error)
    throw error
  }
}

async function onComplete (messageQueue, job) {
  if (!job.failed) {
    await messageQueue.publish(ImportPurposeConditionTypesJob.createMessage())
  }

  global.GlobalNotifier.omg('import.delete-documents: finished')
}

module.exports = {
  createMessage,
  handler,
  onComplete,
  name: JOB_NAME
}
