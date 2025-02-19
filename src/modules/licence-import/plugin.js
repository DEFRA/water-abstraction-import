'use strict'

const cron = require('node-cron')

const ImportCompanyJob = require('./jobs/import-company.js')
const ImportLicenceJob = require('./jobs/import-licence.js')
const ImportPointsJob = require('./jobs/import-points.js')
const QueueCompaniesJob = require('./jobs/queue-companies.js')
const QueueLicencesJob = require('./jobs/queue-licences.js')

const config = require('../../../config')

async function register (server, _options) {
  // Queue up all companies for import by populating water_import.company_import
  await server.messageQueue.subscribe(QueueCompaniesJob.name, QueueCompaniesJob.handler)
  await server.messageQueue.onComplete(QueueCompaniesJob.name, (executedJob) => {
    return QueueCompaniesJob.onComplete(server.messageQueue, executedJob)
  })

  // When the water_import.company_import table is ready, jobs are scheduled to import each company
  await server.messageQueue.subscribe(ImportCompanyJob.name, ImportCompanyJob.options, ImportCompanyJob.handler)
  await server.messageQueue.onComplete(ImportCompanyJob.name, () => {
    return ImportCompanyJob.onComplete(server.messageQueue)
  })

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

  // Import all licence points into WRLS
  await server.messageQueue.subscribe(ImportPointsJob.name, ImportPointsJob.options, ImportPointsJob.handler)
  await server.messageQueue.onComplete(ImportPointsJob.name, () => {
    return ImportPointsJob.onComplete()
  })

  cron.schedule(config.import.licences.schedule, async () => {
    await server.messageQueue.publish(QueueCompaniesJob.createMessage())
  })
}

module.exports = {
  plugin: {
    name: 'importLicenceData',
    dependencies: ['pgBoss'],
    register
  }
}
