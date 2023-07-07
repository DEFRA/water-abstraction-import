'use strict'

const cron = require('node-cron')

const DeleteRemovedDocumentsJob = require('./jobs/delete-removed-documents.js')
const ImportCompanyJob = require('./jobs/import-company.js')
const ImportLicenceJob = require('./jobs/import-licence.js')
const ImportPurposeConditionTypesJob = require('./jobs/import-purpose-condition-types.js')
const QueueCompaniesJob = require('./jobs/queue-companies.js')
const QueueLicencesJob = require('./jobs/queue-licences.js')

const config = require('../../../config')

async function register (server, _options) {
  // First step is to remove any documents that no longer exist in NALD
  await server.messageQueue.subscribe(DeleteRemovedDocumentsJob.name, DeleteRemovedDocumentsJob.handler)
  await server.messageQueue.onComplete(DeleteRemovedDocumentsJob.name, (executedJob) => {
    return DeleteRemovedDocumentsJob.onComplete(server.messageQueue, executedJob)
  })

  // When the documents have been marked as deleted import a list of all companies into the
  // water_import.company_import table
  await server.messageQueue.subscribe(ImportPurposeConditionTypesJob.name, ImportPurposeConditionTypesJob.handler)
  await server.messageQueue.onComplete(ImportPurposeConditionTypesJob.name, (executedJob) => {
    return ImportPurposeConditionTypesJob.onComplete(server.messageQueue, executedJob)
  })

  // When the water_import.company_import table is ready, jobs are scheduled to import each company
  await server.messageQueue.subscribe(QueueCompaniesJob.name, QueueCompaniesJob.handler)
  await server.messageQueue.onComplete(QueueCompaniesJob.name, (executedJob) => {
    return QueueCompaniesJob.onComplete(server.messageQueue, executedJob)
  })

  await server.messageQueue.subscribe(ImportCompanyJob.name, ImportCompanyJob.options, ImportCompanyJob.handler)
  await server.messageQueue.onComplete(ImportCompanyJob.name, () => {
    return ImportCompanyJob.onComplete(server.messageQueue)
  })

  await server.messageQueue.subscribe(QueueLicencesJob.name, QueueLicencesJob.handler)
  await server.messageQueue.onComplete(QueueLicencesJob.name, (executedJob) => {
    return QueueLicencesJob.onComplete(server.messageQueue, executedJob)
  })

  await server.messageQueue.subscribe(ImportLicenceJob.name, ImportLicenceJob.options, ImportLicenceJob.handler)

  cron.schedule(config.import.licences.schedule, async () => {
    await server.messageQueue.publish(DeleteRemovedDocumentsJob.createMessage())
  })
}

module.exports = {
  plugin: {
    name: 'importLicenceData',
    dependencies: ['pgBoss'],
    register
  }
}
