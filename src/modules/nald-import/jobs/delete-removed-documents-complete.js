'use strict'

const logger = require('./lib/logger')

const populatePendingImportJob = require('./populate-pending-import')

const deleteRemovedDocumentsComplete = async (job, messageQueue) => {
  if (job.failed) {
    return logger.logFailedJob(job)
  }

  logger.logHandlingOnCompleteJob(job)

  try {
    // Publish a new job to populate pending import table
    await messageQueue.publish(populatePendingImportJob.createMessage())
  } catch (err) {
    logger.logHandlingOnCompleteError(job, err)
    throw err
  }
}

module.exports = deleteRemovedDocumentsComplete
