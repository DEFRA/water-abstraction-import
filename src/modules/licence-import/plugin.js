'use strict'

const cron = require('node-cron')

const CleanJob = require('./jobs/clean.js')
const ImportCompanyJob = require('./jobs/import-company.js')
const ImportLicenceJob = require('./jobs/import-licence.js')
const ImportPointsJob = require('./jobs/import-points.js')
const ImportPurposeConditionTypesJob = require('./jobs/import-purpose-condition-types.js')
const QueueCompaniesJob = require('./jobs/queue-companies.js')
const QueueLicencesJob = require('./jobs/queue-licences.js')
const TriggerEndDateProcessJob = require('./jobs/trigger-end-date-process.js')

const config = require('../../../config')

async function register (server, _options) {
  // First step is to remove any records that no longer exist in NALD
  await server.messageQueue.subscribe(CleanJob.name, CleanJob.handler)
  await server.messageQueue.onComplete(CleanJob.name, (executedJob) => {
    return CleanJob.onComplete(server.messageQueue, executedJob)
  })

  // Update the reference list of licence purpose condition types
  await server.messageQueue.subscribe(ImportPurposeConditionTypesJob.name, ImportPurposeConditionTypesJob.handler)
  await server.messageQueue.onComplete(ImportPurposeConditionTypesJob.name, (executedJob) => {
    return ImportPurposeConditionTypesJob.onComplete(server.messageQueue, executedJob)
  })

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
  await server.messageQueue.onComplete(ImportPointsJob.name, (executedJob) => {
    return ImportPointsJob.onComplete(server.messageQueue, executedJob)
  })

  // Finally, trigger the licences end date process in water abstraction system. This needs to happen _after_ the
  // licence have been imported
  await server.messageQueue.subscribe(TriggerEndDateProcessJob.name, TriggerEndDateProcessJob.handler)
  await server.messageQueue.onComplete(TriggerEndDateProcessJob.name, () => {
    return TriggerEndDateProcessJob.onComplete()
  })

  cron.schedule(config.import.licences.schedule, async () => {
    await server.messageQueue.publish(CleanJob.createMessage())
  })
}

module.exports = {
  plugin: {
    name: 'importLicenceData',
    dependencies: ['pgBoss'],
    register
  }
}
