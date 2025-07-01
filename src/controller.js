'use strict'

// We use promisify to wrap exec in a promise. This allows us to await it without resorting to using callbacks.
const util = require('util')
const exec = util.promisify(require('child_process').exec)

const db = require('./lib/connectors/db.js')
const PermitJson = require('./lib/permit-json/permit-json.js')

const CleanProcess = require('./modules/clean/process.js')
const CompletionEmailProcess = require('./modules/completion-email/process.js')
const EndDateCheckProcess = require('./modules/end-date-check/process.js')
const EndDateTriggerProcess = require('./modules/end-date-trigger/process.js')
const EtlReturns = require('./modules/etl/returns.js')
const EtlVersions = require('./modules/etl/versions.js')
const EtlVersionLines = require('./modules/etl/version-lines.js')
const ExtractNaldDataProcess = require('./modules/extract-nald-data/process.js')
const FlagDeletedDocumentsProcess = require('./modules/flag-deleted-documents/process.js')
const ImportJobProcess = require('./modules/import-job/process.js')
const InvalidReturnsCleanupProcess = require('./modules/invalid-returns-cleanup/process.js')
const LicenceCrmImportProcess = require('./modules/licence-crm-import/process.js')
const LicenceCrmV2ImportProcess = require('./modules/licence-crm-v2-import/process.js')
const LicenceNoStartDateImportProcess = require('./modules/licence-no-start-date-import/process.js')
const LicencePermitImportProcess = require('./modules/licence-permit-import/process.js')
const LicenceReturnsImportProcess = require('./modules/licence-returns-import/process.js')
const LicenceSubmissionsImportProcess = require('./modules/licence-submissions-import/process.js')
const LicencesImportProcess = require('./modules/licences-import/process.js')
const LinkToModLogsProcess = require('./modules/link-to-mod-logs/process.js')
const PartyCrmV2ImportProcess = require('./modules/party-crm-v2-import/process.js')
const ReferenceDataImportProcess = require('./modules/reference-data-import/process.js')

const config = require('../config.js')

async function clean (_request, h) {
  CleanProcess.go(config.import.licences.isCleanLicenceImportsEnabled, true)

  return h.response().code(204)
}

async function completionEmail (_request, h) {
  const dummySteps = [
    { duration: 0.5, logTime: new Date(), name: 'super-short', messages: [] },
    { duration: 47, logTime: new Date(), name: 'few-seconds', messages: ['Skipped for reasons'] },
    { duration: 105, logTime: new Date(), name: 'minute-and-change', messages: ['Errored because of widget'] },
    { duration: 6318, logTime: new Date(), name: 'hour-and-change', messages: [] }
  ]
  CompletionEmailProcess.go(dummySteps)

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

async function etlReturns (request, h) {
  const { start, end } = request.query

  const result = await EtlReturns.go(start, end)

  return h.response(result).code(200)
}

async function etlVersions (request, h) {
  const { start, end } = request.query

  const result = await EtlVersions.go(start, end)

  return h.response(result).code(200)
}

async function etlVersionLines (request, h) {
  const { versionId: returnSubmissionId } = request.params

  const result = await EtlVersionLines.go(returnSubmissionId)

  return h.response(result).code(200)
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

async function importJob (_request, h) {
  ImportJobProcess.go()

  return h.response().code(204)
}

async function invalidReturnsCleanup (_request, h) {
  InvalidReturnsCleanupProcess.go(true)

  return h.response().code(204)
}

async function licenceCrmImport (request, h) {
  const { licenceRef } = request.payload

  const permitJson = await PermitJson.go(licenceRef)

  LicenceCrmImportProcess.go(permitJson, true)

  return h.response().code(204)
}

async function licenceCrmV2Import (request, h) {
  const { licenceRef } = request.payload

  const permitJson = await PermitJson.go(licenceRef)

  LicenceCrmV2ImportProcess.go(permitJson, true)

  return h.response().code(204)
}

async function licenceNoStartDateImport (request, h) {
  const { licenceRef } = request.payload

  const permitJson = await PermitJson.go(licenceRef)

  LicenceNoStartDateImportProcess.go(permitJson, true)

  return h.response().code(204)
}

async function licencePermitImport (request, h) {
  const { licenceRef } = request.payload

  const permitJson = await PermitJson.go(licenceRef)

  LicencePermitImportProcess.go(permitJson, true)

  return h.response().code(204)
}

async function licenceReturnsImport (request, h) {
  const { licenceRef } = request.payload

  const query = 'SELECT l.* FROM "import"."NALD_ABS_LICENCES" l WHERE l."LIC_NO" = $1;'
  const results = await db.query(query, [licenceRef])

  LicenceReturnsImportProcess.go(results[0], null, true)

  return h.response().code(204)
}

async function licenceSubmissionsImport (request, h) {
  const { licenceRef } = request.payload

  const query = 'SELECT l.* FROM "import"."NALD_ABS_LICENCES" l WHERE l."LIC_NO" = $1;'
  const results = await db.query(query, [licenceRef])

  LicenceSubmissionsImportProcess.go(results[0], null, true)

  return h.response().code(204)
}

async function licencesImport (_request, h) {
  LicencesImportProcess.go(true)

  return h.response().code(204)
}

async function linkToModLogs (_request, h) {
  LinkToModLogsProcess.go(true)

  return h.response().code(204)
}

async function partyCrmV2Import (request, h) {
  const { partyId, regionCode } = request.payload
  const results = await db.query(
    `SELECT "ID", "APAR_TYPE", "NAME", "FORENAME", "INITIALS", "SALUTATION", "FGAC_REGION_CODE"
    FROM "import"."NALD_PARTIES" WHERE "ID" = $1 AND "FGAC_REGION_CODE" = $2;`,
    [partyId, regionCode]
  )

  PartyCrmV2ImportProcess.go(results[0], true)

  return h.response().code(204)
}

async function referenceDataImport (_request, h) {
  ReferenceDataImportProcess.go(true)

  return h.response().code(204)
}

function status (_request, _h) {
  return { status: 'alive' }
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
  clean,
  completionEmail,
  endDateCheck,
  endDateTrigger,
  etlReturns,
  etlVersions,
  etlVersionLines,
  extractNaldData,
  flagDeletedDocuments,
  healthInfo,
  importJob,
  invalidReturnsCleanup,
  licenceCrmImport,
  licenceCrmV2Import,
  licenceNoStartDateImport,
  licencePermitImport,
  licenceReturnsImport,
  licenceSubmissionsImport,
  licencesImport,
  linkToModLogs,
  partyCrmV2Import,
  referenceDataImport,
  status
}
