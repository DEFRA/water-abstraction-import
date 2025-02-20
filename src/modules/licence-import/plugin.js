'use strict'

const cron = require('node-cron')

const ImportLicenceJob = require('./jobs/import-licence.js')
const QueueLicencesJob = require('./jobs/queue-licences.js')

const config = require('../../../config')

async function register (server, _options) {
  // Queue up the licences for import
  await server.messageQueue.subscribe(QueueLicencesJob.name, QueueLicencesJob.handler)
  await server.messageQueue.onComplete(QueueLicencesJob.name, (executedJob) => {
    return QueueLicencesJob.onComplete(server.messageQueue, executedJob)
  })

  // Process the licence queue, inserting or updating each licence found
  await server.messageQueue.subscribe(ImportLicenceJob.name, ImportLicenceJob.options, ImportLicenceJob.handler)
  await server.messageQueue.onComplete(ImportLicenceJob.name, (executedJob) => {
    return ImportLicenceJob.onComplete(server.messageQueue, executedJob)
  })

  cron.schedule(config.import.licences.schedule, async () => {
    await server.messageQueue.publish(QueueLicencesJob.createMessage())
  })
}

module.exports = {
  plugin: {
    name: 'importLicenceData',
    dependencies: ['pgBoss'],
    register
  }
}
