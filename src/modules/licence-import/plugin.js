'use strict'

const cron = require('node-cron')
const jobs = require('./jobs')
const handlers = require('./handlers')

const config = require('../../../config')

const getOptions = () => ({
  teamSize: 500,
  teamConcurrency: 1
})

const registerSubscribers = async server => {
  // The first step is to remove any documents that no longer exist in NALD
  await server.messageQueue.subscribe(jobs.DELETE_DOCUMENTS_JOB, handlers.deleteDocuments)

  await server.messageQueue.onComplete(jobs.DELETE_DOCUMENTS_JOB,
    () => handlers.onCompleteDeleteDocuments(server.messageQueue))

  // When the documents have been marked as deleted
  // import a list of all companies into the water_import.company_import table
  await server.messageQueue.onComplete(jobs.IMPORT_PURPOSE_CONDITION_TYPES_JOB,
    () => handlers.onCompleteImportPurposeConditionTypes(server.messageQueue)
  )

  // When the water_import.company_import table is ready, jobs are scheduled to import each company
  await server.messageQueue.onComplete(jobs.IMPORT_COMPANIES_JOB,
    () => handlers.onCompleteImportCompanies()
  )

  // Import licences when all companies are imported
  await server.messageQueue.onComplete(jobs.IMPORT_COMPANY_JOB,
    () => handlers.onCompleteImportCompany(server.messageQueue)
  )

  await server.messageQueue.subscribe(jobs.IMPORT_PURPOSE_CONDITION_TYPES_JOB, handlers.importPurposeConditionTypes)
  await server.messageQueue.subscribe(jobs.IMPORT_COMPANIES_JOB, handlers.importCompanies)
  await server.messageQueue.subscribe(jobs.IMPORT_COMPANY_JOB, getOptions(), handlers.importCompany)
  await server.messageQueue.subscribe(jobs.IMPORT_LICENCES_JOB, handlers.importLicences)
  await server.messageQueue.onComplete(jobs.IMPORT_LICENCES_JOB,
    (job) => handlers.onCompleteImportLicences(server.messageQueue, job)
  )

  await server.messageQueue.subscribe(jobs.IMPORT_LICENCE_JOB, getOptions(), handlers.importLicence)

  cron.schedule(config.import.licences.schedule, async () => {
    await server.messageQueue.publish(jobs.deleteDocuments())
  })
}

const plugin = {
  name: 'importLicenceData',
  dependencies: ['pgBoss'],
  register: server => registerSubscribers(server)
}

module.exports = {
  plugin
}
