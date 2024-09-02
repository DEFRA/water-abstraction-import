'use strict'

const cron = require('node-cron')

const ImportJob = require('./jobs/import.js')

const config = require('../../../config')

async function register (server, _options) {
  // Register import mod logs job
  await server.messageQueue.subscribe(ImportJob.JOB_NAME, ImportJob.handler)
  await server.messageQueue.onComplete(ImportJob.JOB_NAME, (executedJob) => {
    return ImportJob.onComplete(executedJob)
  })

  // Set up import on cron job
  cron.schedule(config.import.modLogs.schedule, async () => {
    await server.messageQueue.publish(ImportJob.createMessage())
  })
}

module.exports = {
  plugin: {
    name: 'importModLogs',
    dependencies: ['pgBoss'],
    register
  }
}
