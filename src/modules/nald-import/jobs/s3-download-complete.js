'use strict'

const logger = require('./lib/logger')

const populatePendingImportJob = require('./populate-pending-import')
const deleteRemovedDocumentsJob = require('./delete-removed-documents')
const importLicenceJob = require('./import-licence')

const s3DownloadComplete = async (job, messageQueue) => {
  if (job.failed) {
    return logger.logFailedJob(job)
  }

  logger.logHandlingOnCompleteJob(job)

  try {
    const { isRequired } = job.data.response

    if (!isRequired) {
      return logger.logAbortingOnComplete(job)
    }

    // Delete existing PG boss import queues
    await Promise.all([
      messageQueue.deleteQueue(importLicenceJob.jobName),
      messageQueue.deleteQueue(deleteRemovedDocumentsJob.jobName),
      messageQueue.deleteQueue(populatePendingImportJob.jobName)
    ])

    // Publish a new job to delete any removed documents
    await messageQueue.publish(deleteRemovedDocumentsJob.createMessage())
  } catch (err) {
    logger.logHandlingOnCompleteError(job, err)
    throw err
  }
}

module.exports = s3DownloadComplete
