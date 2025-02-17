'use strict'

// We use promisify to wrap exec in a promise. This allows us to await it without resorting to using callbacks.
const util = require('util')
const exec = util.promisify(require('child_process').exec)

const BillRunsImportProcess = require('./modules/bill-runs-import/process.js')
const ChargeVersionsImportProcess = require('./modules/charge-versions-import/process.js')
const CleanProcess = require('./modules/clean/process.js')
const ClearQueuesProcess = require('./modules/clear-queues/process.js')
const EndDateCheckProcess = require('./modules/end-date-check/process.js')
const ExtractNaldDataProcess = require('./modules/extract-nald-data/process.js')
const FlagDeletedDocumentsProcess = require('./modules/flag-deleted-documents/process.js')
const ReferenceDataImportProcess = require('./modules/reference-data-import/process.js')
const ReturnVersionsImportProcess = require('./modules/return-versions-import/process.js')

const ClearQueuesJob = require('./modules/import-job/jobs/clear-queues.js')
const JobsConnector = require('./lib/connectors/water-import/jobs.js')

const config = require('../config.js')

async function billRunsImport (_request, h) {
  BillRunsImportProcess.go(true)

  return h.response().code(204)
}

async function chargeVersionsImport (_request, h) {
  ChargeVersionsImportProcess.go(true)

  return h.response().code(204)
}

async function clean (_request, h) {

  CleanProcess.go(config.import.licences.isCleanLicenceImportsEnabled, true)

  return h.response().code(204)
}

async function clearQueues (request, h) {
  ClearQueuesProcess.go(request.server.messageQueue, true)

  return h.response().code(204)
}

async function endDateCheck (_request, h) {
  EndDateCheckProcess.go(true)

  return h.response().code(204)
}

async function extractNaldData (_request, h) {
  ExtractNaldDataProcess.go(true)

  return h.response().code(204)
}

async function flagDeletedDocuments (_request, h) {
  FlagDeletedDocumentsProcess.go(true)

  return h.response().code(204)
}

async function healthInfo (_request, h) {
  const result = {
    version: await _tagReference(),
    commit: await _commitHash()
  }

  return h.response(result).code(200)
}

async function importJob (request, h) {
  await request.messageQueue.publish(ClearQueuesJob.createMessage())

  return h.response().code(204)
}

async function jobSummary (_request, h) {
  const summary = await JobsConnector.getJobSummary()

  return h.response(summary).code(200)
}

async function referenceDataImport (_request, h) {
  ReferenceDataImportProcess.go(true)

  return h.response().code(204)
}

async function returnVersionsImport (_request, h) {

  ReturnVersionsImportProcess.go(config.featureFlags.disableReturnsImports, true)

  return h.response().code(204)
}

async function _tagReference () {
  try {
    const { stdout, stderr } = await exec('git describe --always --tags')

    return stderr ? `ERROR: ${stderr}` : stdout.replace('\n', '')
  } catch (error) {
    return `ERROR: ${error.message}`
  }
}

async function _commitHash () {
  try {
    const { stdout, stderr } = await exec('git rev-parse HEAD')

    return stderr ? `ERROR: ${stderr}` : stdout.replace('\n', '')
  } catch (error) {
    return `ERROR: ${error.message}`
  }
}

module.exports = {
  billRunsImport,
  chargeVersionsImport,
  clean,
  clearQueues,
  endDateCheck,
  extractNaldData,
  flagDeletedDocuments,
  healthInfo,
  jobSummary,
  importJob,
  referenceDataImport,
  returnVersionsImport
}
