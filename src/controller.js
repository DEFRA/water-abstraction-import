'use strict'

// We use promisify to wrap exec in a promise. This allows us to await it without resorting to using callbacks.
const util = require('util')
const exec = util.promisify(require('child_process').exec)

const db = require('./lib/connectors/db.js')
const PermitJson = require('./lib/permit-json/permit-json.js')

const BillRunsImportProcess = require('./modules/bill-runs-import/process.js')
const ChargeVersionsImportProcess = require('./modules/charge-versions-import/process.js')
const CleanProcess = require('./modules/clean/process.js')
const ClearQueuesProcess = require('./modules/clear-queues/process.js')
const CompletionEmailProcess = require('./modules/completion-email/process.js')
const CrmV2ImportProcess = require('./modules/crm-v2-import/process.js')
const EndDateCheckProcess = require('./modules/end-date-check/process.js')
const EndDateTriggerProcess = require('./modules/end-date-trigger/process.js')
const ExtractNaldDataProcess = require('./modules/extract-nald-data/process.js')
const ExtractOldLinesProcess = require('./modules/extract-old-lines/process.js')
const FlagDeletedDocumentsProcess = require('./modules/flag-deleted-documents/process.js')
const LicenceCrmImportProcess = require('./modules/licence-crm-import/process.js')
const LicenceCrmV2ImportProcess = require('./modules/licence-crm-v2-import/process.js')
const LicenceNoStartDateImportProcess = require('./modules/licence-no-start-date-import/process.js')
const LicencePermitImportProcess = require('./modules/licence-permit-import/process.js')
const LicenceReturnsImportProcess = require('./modules/licence-returns-import/process.js')
const LicenceVersionsImportProcess = require('./modules/licence-versions-import/process.js')
const LinkToModLogsProcess = require('./modules/link-to-mod-logs/process.js')
const ReferenceDataImportProcess = require('./modules/reference-data-import/process.js')
const ReturnVersionsImportProcess = require('./modules/return-versions-import/process.js')

const ClearQueuesJob = require('./modules/import-job/jobs/clear-queues.js')

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

async function completionEmail (_request, h) {
  CompletionEmailProcess.go(true)

  return h.response().code(204)
}

async function crmV2Import (request, h) {
  const { partyId, regionCode } = request.payload
  const results = await db.query(
    `SELECT "ID", "APAR_TYPE", "NAME", "FORENAME", "INITIALS", "SALUTATION", "FGAC_REGION_CODE"
    FROM "import"."NALD_PARTIES" WHERE "FGAC_REGION_CODE"=$1 AND "ID" = $2;`,
    [partyId, regionCode]
  )

  CrmV2ImportProcess.go(results[0], 0, true)

  return h.response().code(204)
}

async function endDateCheck (_request, h) {
  EndDateCheckProcess.go(true)

  return h.response().code(204)
}

async function endDateTrigger (_request, h) {
  EndDateTriggerProcess.go(true)

  return h.response().code(204)
}

async function extractNaldData (_request, h) {
  ExtractNaldDataProcess.go(true)

  return h.response().code(204)
}

async function extractOldLines (_request, h) {
  ExtractOldLinesProcess.go(config.featureFlags.disableReturnsImports, true)

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

async function licenceCrmImport (request, h) {
  const { licenceRef } = request.payload

  const permitJson = await PermitJson.go(licenceRef)

  LicenceCrmImportProcess.go(permitJson, 0, true)

  return h.response().code(204)
}

async function licenceCrmV2Import (request, h) {
  const { licenceRef } = request.payload

  const permitJson = await PermitJson.go(licenceRef)

  LicenceCrmV2ImportProcess.go(permitJson, 0, true)

  return h.response().code(204)
}

async function licenceNoStartDateImport (request, h) {
  const { licenceRef } = request.payload

  const permitJson = await PermitJson.go(licenceRef)

  LicenceNoStartDateImportProcess.go(permitJson, 0, true)

  return h.response().code(204)
}

async function licencePermitImport (request, h) {
  const { licenceRef } = request.payload

  const permitJson = await PermitJson.go(licenceRef)

  LicencePermitImportProcess.go(permitJson, 0, true)

  return h.response().code(204)
}

async function licenceReturnsImport (request, h) {
  const { licenceRef } = request.payload

  const query = 'SELECT l.* FROM "import"."NALD_ABS_LICENCES" l WHERE l."LIC_NO" = $1;'
  const results = await db.query(query, [licenceRef])

  LicenceReturnsImportProcess.go(results[0], 0, true)

  return h.response().code(204)
}

async function licenceVersionsImport (_request, h) {
  LicenceVersionsImportProcess.go(true)

  return h.response().code(204)
}

async function linkToModLogs (_request, h) {
  LinkToModLogsProcess.go(true)

  return h.response().code(204)
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
  completionEmail,
  crmV2Import,
  endDateCheck,
  endDateTrigger,
  extractNaldData,
  extractOldLines,
  flagDeletedDocuments,
  healthInfo,
  importJob,
  licenceCrmImport,
  licenceCrmV2Import,
  licenceNoStartDateImport,
  licencePermitImport,
  licenceReturnsImport,
  licenceVersionsImport,
  linkToModLogs,
  referenceDataImport,
  returnVersionsImport
}
