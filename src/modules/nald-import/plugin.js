'use strict'

const cron = require('node-cron')

const deleteRemovedDocumentsJob = require('./jobs/delete-removed-documents.js')
const deleteRemovedDocumentsComplete = require('./jobs/delete-removed-documents-complete.js')
const populatePendingImportJob = require('./jobs/populate-pending-import.js')
const populatePendingImportComplete = require('./jobs/populate-pending-import-complete.js')
const s3DownloadJob = require('./jobs/s3-download.js')
const s3DownloadOnComplete = require('./jobs/s3-download-complete.js')
const importLicenceJob = require('./jobs/import-licence.js')

const config = require('../../../config')

const registerSubscribers = async (server) => {
  // These are the steps in the import process. This is creating the 'queues' and where relevant, setting the
  // a handler to be called when a job in that queue completes

  // First step is to download the nald_enc.zip from S3, extract it, and push the data into 'import'
  await server.messageQueue.subscribe(s3DownloadJob.jobName, s3DownloadJob.handler)
  await server.messageQueue.onComplete(s3DownloadJob.jobName, (executedJob) => {
    return s3DownloadOnComplete.handler(server.messageQueue, executedJob)
  })

  // Next step is to delete documents that have been removed from NALD
  await server.messageQueue.subscribe(deleteRemovedDocumentsJob.jobName, deleteRemovedDocumentsJob.handler)
  await server.messageQueue.onComplete(deleteRemovedDocumentsJob.jobName, () => {
    return deleteRemovedDocumentsComplete.handler(server.messageQueue)
  })

  // Then we get the licences to import and publish a job for each one
  await server.messageQueue.subscribe(populatePendingImportJob.jobName, populatePendingImportJob.handler)
  await server.messageQueue.onComplete(populatePendingImportJob.jobName, (executedJob) => {
    return populatePendingImportComplete.handler(server.messageQueue, executedJob)
  })

  // Then we import each licence
  await server.messageQueue.subscribe(importLicenceJob.jobName, importLicenceJob.options, importLicenceJob.handler)

  // If we're not running the unit tests, setup the schedule for the first job in the chain
  if (process.env.NODE_ENV !== 'test') {
    cron.schedule(_schedule(), async () => {
      await server.messageQueue.publish(s3DownloadJob.createMessage())
    })
  }
}

const _schedule = () => {
  return config.isProduction ? '0 1 * * *' : '0 */1 * * *'
}

const plugin = {
  name: 'importNaldData',
  dependencies: ['pgBoss'],
  register: registerSubscribers
}

module.exports = {
  plugin
}
