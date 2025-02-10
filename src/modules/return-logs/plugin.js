'use strict'

const cron = require('node-cron')

const DownloadJob = require('./jobs/download.js')
const QueueJob = require('./jobs/queue.js')
const ImportJob = require('./jobs/import.js')

const config = require('../../../config')

async function register (server, _options) {
  // Check if the old return lines extract needs downloading and loading into the DB
  await server.messageQueue.subscribe(DownloadJob.JOB_NAME, (executedJob) => {
    return DownloadJob.handler(executedJob)
  })
  await server.messageQueue.onComplete(DownloadJob.JOB_NAME, (executedJob) => {
    return DownloadJob.onComplete(server.messageQueue, executedJob)
  })

  // Queue the licences for processing
  await server.messageQueue.subscribe(QueueJob.JOB_NAME, (executedJob) => {
    return QueueJob.handler(server.messageQueue, executedJob)
  })
  await server.messageQueue.onComplete(QueueJob.JOB_NAME, (executedJob) => {
    return QueueJob.onComplete(executedJob)
  })

  // Register import return logs job
  await server.messageQueue.subscribe(ImportJob.JOB_NAME, ImportJob.handler)
  await server.messageQueue.onComplete(ImportJob.JOB_NAME, (executedJob) => {
    return ImportJob.onComplete(executedJob)
  })

  // Schedule download job using cron. The download job will then queue up the queue job in its onComplete
  cron.schedule(config.import.returnLogs.schedule, async () => {
    if (!config.featureFlags.disableReturnsImports) {
      await server.messageQueue.publish(DownloadJob.createMessage())
    }
  })
}

module.exports = {
  plugin: {
    name: 'importReturnLogs',
    dependencies: ['pgBoss'],
    register
  }
}
