'use strict'

const cron = require('node-cron')

const CleanJob = require('./jobs/clean.js')
const ImportJob = require('./jobs/import.js')

const config = require('../../../config')

async function register (server, _options) {
  // Register clean return versions job
  await server.messageQueue.subscribe(CleanJob.JOB_NAME, CleanJob.handler)
  await server.messageQueue.onComplete(CleanJob.JOB_NAME, (executedJob) => {
    return CleanJob.onComplete(server.messageQueue, executedJob)
  })

  // Register import return versions job
  await server.messageQueue.subscribe(ImportJob.JOB_NAME, ImportJob.handler)
  await server.messageQueue.onComplete(ImportJob.JOB_NAME, (executedJob) => {
    return ImportJob.onComplete(executedJob)
  })

  // Schedule clean job using cron. The clean job will then queue the import job in its onComplete
  cron.schedule(config.import.returnVersions.schedule, async () => {
    await server.messageQueue.publish(CleanJob.createMessage())
  })
}

module.exports = {
  plugin: {
    name: 'importReturnVersions',
    dependencies: ['pgBoss'],
    register
  }
}
