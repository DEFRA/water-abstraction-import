'use strict'

const deleteRemovedDocumentsJob = require('./delete-removed-documents')
const importLicenceJob = require('./import-licence')
const populatePendingImportJob = require('./populate-pending-import')

async function handler (messageQueue, job) {
  const { isRequired } = job.data.response

  if (isRequired) {
    // Delete existing PG boss import queues
    await Promise.all([
      messageQueue.deleteQueue(importLicenceJob.jobName),
      messageQueue.deleteQueue(deleteRemovedDocumentsJob.jobName),
      messageQueue.deleteQueue(populatePendingImportJob.jobName)
    ])

    // Publish a new job to delete any removed documents
    await messageQueue.publish(deleteRemovedDocumentsJob.createMessage())
  }

  global.GlobalNotifier.omg('nald-import.s3-download: finished', job.data.response)
}

module.exports = {
  handler
}
