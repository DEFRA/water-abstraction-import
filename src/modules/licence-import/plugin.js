'use strict'

const cron = require('node-cron')

const DeleteDocumentsJob = require('./jobs/delete-documents.js')
const ImportCompaniesJob = require('./jobs/import-companies.js')
const ImportCompanyJob = require('./jobs/import-company.js')
const ImportLicencesJob = require('./jobs/import-licences.js')
const ImportLicenceJob = require('./jobs/import-licence.js')
const ImportPurposeConditionTypesJob = require('./jobs/import-purpose-condition-types.js')

const config = require('../../../config')

async function register (server, _options) {
  // First step is to remove any documents that no longer exist in NALD
  await server.messageQueue.subscribe(DeleteDocumentsJob.name, DeleteDocumentsJob.handler)
  await server.messageQueue.onComplete(DeleteDocumentsJob.name, (executedJob) => {
    return DeleteDocumentsJob.onComplete(server.messageQueue, executedJob)
  })

  // When the documents have been marked as deleted import a list of all companies into the
  // water_import.company_import table
  await server.messageQueue.subscribe(ImportPurposeConditionTypesJob.name, ImportPurposeConditionTypesJob.handler)
  await server.messageQueue.onComplete(ImportPurposeConditionTypesJob.name, (executedJob) => {
    return ImportPurposeConditionTypesJob.onComplete(server.messageQueue, executedJob)
  })

  // When the water_import.company_import table is ready, jobs are scheduled to import each company
  await server.messageQueue.subscribe(ImportCompaniesJob.name, ImportCompaniesJob.handler)
  await server.messageQueue.onComplete(ImportCompaniesJob.name, (executedJob) => {
    return ImportCompaniesJob.onComplete(server.messageQueue, executedJob)
  })

  await server.messageQueue.subscribe(ImportCompanyJob.name, ImportCompanyJob.options, ImportCompanyJob.handler)
  await server.messageQueue.onComplete(ImportCompanyJob.name, () => {
    return ImportCompanyJob.onComplete(server.messageQueue)
  })

  await server.messageQueue.subscribe(ImportLicencesJob.name, ImportLicencesJob.handler)
  await server.messageQueue.onComplete(ImportLicencesJob.name, (executedJob) => {
    return ImportLicencesJob.onComplete(server.messageQueue, executedJob)
  })

  await server.messageQueue.subscribe(ImportLicenceJob.name, ImportLicenceJob.options, ImportLicenceJob.handler)

  cron.schedule(config.import.licences.schedule, async () => {
    await server.messageQueue.publish(DeleteDocumentsJob.createMessage())
  })
}

module.exports = {
  plugin: {
    name: 'importLicenceData',
    dependencies: ['pgBoss'],
    register
  }
}
