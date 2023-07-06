'use strict'

const cron = require('node-cron')

const DeleteRemovedDocumentsJob = require('./jobs/delete-removed-documents.js')
const ImportLicenceJob = require('./jobs/import-licence.js')
const QueueLicencesJob = require('./jobs/queue-licences.js')
const S3DownloadJob = require('./jobs/s3-download.js')

const config = require('../../../config')

async function register (server) {
  // These are the steps in the import process. This is creating the 'queues' and where relevant, setting the
  // a handler to be called when a job in that queue completes

  // First step is to download the nald_enc.zip from S3, extract it, and push the data into 'import'
  await server.messageQueue.subscribe(S3DownloadJob.name, S3DownloadJob.handler)
  await server.messageQueue.onComplete(S3DownloadJob.name, (executedJob) => {
    return S3DownloadJob.onComplete(server.messageQueue, executedJob)
  })

  // Next step is to delete documents that have been removed from NALD
  await server.messageQueue.subscribe(DeleteRemovedDocumentsJob.name, DeleteRemovedDocumentsJob.handler)
  await server.messageQueue.onComplete(DeleteRemovedDocumentsJob.name, (executedJob) => {
    return DeleteRemovedDocumentsJob.onComplete(server.messageQueue, executedJob)
  })

  // Then we get the licences to import and publish a job for each one
  await server.messageQueue.subscribe(QueueLicencesJob.name, QueueLicencesJob.handler)
  await server.messageQueue.onComplete(QueueLicencesJob.name, (executedJob) => {
    return QueueLicencesJob.onComplete(server.messageQueue, executedJob)
  })

  // Then we import each licence
  await server.messageQueue.subscribe(ImportLicenceJob.name, ImportLicenceJob.options, ImportLicenceJob.handler)

  cron.schedule(config.import.nald.schedule, async () => {
    await server.messageQueue.publish(S3DownloadJob.createMessage())
  })
}

module.exports = {
  plugin: {
    name: 'importNaldData',
    dependencies: ['pgBoss'],
    register
  }
}
