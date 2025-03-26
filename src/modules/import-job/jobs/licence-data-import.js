'use strict'

const db = require('../../../lib/connectors/db.js')

const LicenceCrmImportProcess = require('../../licence-crm-import/process.js')
const LicenceCrmV2ImportProcess = require('../../licence-crm-v2-import/process.js')
const LicenceNoStartDateImportProcess = require('../../licence-no-start-date-import/process.js')
const LicencePermitImportProcess = require('../../licence-permit-import/process.js')
const LicenceReturnsImportProcess = require('../../licence-returns-import/process.js')
const PermitJson = require('../../../lib/permit-json/permit-json.js')

const LicencesImportJob = require('./licences-import.js')

const config = require('../../../../config.js')

const JOB_NAME = 'import-job.licence-data-import'

function createMessage () {
  return {
    name: JOB_NAME,
    options: {
      expireIn: '8 hours',
      singletonKey: JOB_NAME
    }
  }
}

async function handler () {
  try {
    global.GlobalNotifier.omg(`${JOB_NAME}: started`)

    const licences = await _licences()
    const messages = []

    if (config.featureFlags.disableReturnsImports) {
      messages.push('Skipped licence-returns-import because importing returns is disabled')
    }

    for (const [index, licence] of licences.entries()) {
      const permitJson = await PermitJson.go(licence)

      const results = await Promise.allSettled([
        LicencePermitImportProcess.go(permitJson, index, false),
        LicenceCrmV2ImportProcess.go(permitJson, index, false),
        LicenceNoStartDateImportProcess.go(permitJson, index, false),
        _licenceReturnsImport(licence, index)
      ])

      // This has to be persisted after LicencePermitImportProcess completes, because it depends on the `permit.licence`
      // record having been created for new licences
      await LicenceCrmImportProcess.go(permitJson, index, false)

      _logMessages(results, index, licence, messages)
    }

    return messages
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (messageQueue, job) {
  const state = job.data.failed ? 'failed' : 'completed'

  global.GlobalNotifier.omg(`${JOB_NAME}: ${state}`)

  await messageQueue.publish(LicencesImportJob.createMessage())
}

async function _licenceReturnsImport(licence, index) {
  if (config.featureFlags.disableReturnsImports) {
    return []
  }

  return LicenceReturnsImportProcess.go(licence, index, false)
}

async function _licences () {
  return db.query(`
    SELECT
      nal.*
    FROM
      "import"."NALD_ABS_LICENCES" nal
    WHERE EXISTS (
      SELECT
        1
      FROM
        "import"."NALD_ABS_LIC_VERSIONS" nalv
      WHERE
        nalv."AABL_ID" = nal."ID"
        AND nalv."FGAC_REGION_CODE" = nal."FGAC_REGION_CODE"
        AND nalv."STATUS" <> 'DRAFT'
    );
  `)
}

function _logMessages (results, index, licence, messages) {
  for (const result of results) {
    if (result.status === 'rejected') {
      global.GlobalNotifier.omg(`${JOB_NAME}: errored`, { index, licence, error })

      messages.push(`${licence.LIC_NO} errored: ${error.message}`)

      continue
    }

    messages.push(...result.value)
  }
}

module.exports = {
  JOB_NAME,
  createMessage,
  handler,
  onComplete
}
