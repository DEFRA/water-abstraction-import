'use strict'

const logger = require('./lib/logger')

const JOB_NAME = 'nald-import.delete-removed-documents'
const importService = require('../../../lib/services/import')

const createMessage = () => ({
  name: JOB_NAME,
  options: {
    expireIn: '1 hours',
    singletonKey: JOB_NAME
  }
})

const handler = async job => {
  logger.logHandlingJob(job)

  try {
    return importService.deleteRemovedDocuments()
  } catch (err) {
    logger.logJobError(job, err)
    throw err
  }
}

module.exports = {
  createMessage,
  handler,
  jobName: JOB_NAME
}
