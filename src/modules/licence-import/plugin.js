'use strict'

const ImportLicenceJob = require('./jobs/import-licence.js')
const ImportPointsJob = require('./jobs/import-points.js')
const QueueLicencesJob = require('./jobs/queue-licences.js')

async function register (server, _options) {
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
