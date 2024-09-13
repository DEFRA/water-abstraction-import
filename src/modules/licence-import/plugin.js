'use strict'

const ImportLicenceJob = require('./jobs/import-licence.js')
const ImportLicenceSystemJob = require('./jobs/import-licence-system.js')
const ImportPointsJob = require('./jobs/import-points.js')
const QueueLicencesJob = require('./jobs/queue-licences.js')
const QueueLicencesSystemJob = require('./jobs/queue-licences-system.js')

async function register (server, _options) {
  await server.messageQueue.subscribe(QueueLicencesSystemJob.name, QueueLicencesSystemJob.handler)
  await server.messageQueue.onComplete(QueueLicencesSystemJob.name, (executedJob) => {
    return QueueLicencesSystemJob.onComplete(server.messageQueue, executedJob)
  })

  await server.messageQueue.subscribe(ImportLicenceSystemJob.name, ImportLicenceSystemJob.options, ImportLicenceSystemJob.handler)
  await server.messageQueue.onComplete(ImportLicenceSystemJob.name, (executedJob) => {
    return ImportLicenceSystemJob.onComplete(server.messageQueue, executedJob)
  })

  await server.messageQueue.subscribe(QueueLicencesJob.name, QueueLicencesJob.handler)
  await server.messageQueue.onComplete(QueueLicencesJob.name, (executedJob) => {
    return QueueLicencesJob.onComplete(server.messageQueue, executedJob)
  })

  await server.messageQueue.subscribe(ImportLicenceJob.name, ImportLicenceJob.options, ImportLicenceJob.handler)
  await server.messageQueue.onComplete(ImportLicenceJob.name, (executedJob) => {
    return ImportLicenceJob.onComplete(server.messageQueue, executedJob)
  })

  await server.messageQueue.subscribe(ImportPointsJob.name, ImportPointsJob.options, ImportPointsJob.handler)
  await server.messageQueue.onComplete(ImportPointsJob.name, () => {
    return ImportPointsJob.onComplete()
  })
}

module.exports = {
  plugin: {
    name: 'importLicenceData',
    dependencies: ['pgBoss'],
    register
  }
}
