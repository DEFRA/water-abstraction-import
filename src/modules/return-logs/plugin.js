'use strict'

const cron = require('node-cron')

const QueueJob = require('./jobs/queue.js')
const ImportJob = require('./jobs/import.js')

const config = require('../../../config')

async function register (server, _options) {
  // Queue the licences for processing
  await server.messageQueue.subscribe(QueueJob.JOB_NAME, () => {
    return QueueJob.handler(server.messageQueue)
  })
  await server.messageQueue.onComplete(QueueJob.JOB_NAME, (executedJob) => {
    return QueueJob.onComplete(executedJob)
  })

  // Register import return logs job
  await server.messageQueue.subscribe(ImportJob.JOB_NAME, ImportJob.handler)
  await server.messageQueue.onComplete(ImportJob.JOB_NAME, (executedJob) => {
    return ImportJob.onComplete(executedJob)
  })

  // Schedule queue job using cron. The queue job will then queue the import job in its onComplete
  cron.schedule(config.import.returnLogs.schedule, async () => {
    if (!config.featureFlags.disableReturnsImports) {
      await server.messageQueue.publish(QueueJob.createMessage())
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
