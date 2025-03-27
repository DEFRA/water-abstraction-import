'use strict'

const db = require('../../../lib/connectors/db.js')
const { currentTimeInNanoseconds, durations } = require('../../../lib/general.js')
const LicenceCrmImportProcess = require('../../licence-crm-import/process.js')
const LicenceCrmV2ImportProcess = require('../../licence-crm-v2-import/process.js')
const LicenceNoStartDateImportProcess = require('../../licence-no-start-date-import/process.js')
const LicencePermitImportProcess = require('../../licence-permit-import/process.js')
const LicenceReturnsImportProcess = require('../../licence-returns-import/process.js')
const PermitJson = require('../../../lib/permit-json/permit-json.js')

const config = require('../../../../config.js')

const STEP_NAME = 'licence-data-import'

async function go () {
  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: started`)

  const step = { logTime: new Date(), name: STEP_NAME }

  const startTime = currentTimeInNanoseconds()

  step.messages = await _process()

  const { timeTakenSs } = durations(startTime)

  step.duration = timeTakenSs

  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: completed`)

  return step
}

/**
 * We need to pass LicenceReturnsImportProcess to the Promise.allSettled() in _process() but only if importing returns
 * is not disabled.
 *
 * So, because whether it gets called is dynamic, we have to wrap the actual call in this function. If importing returns
 * is enabled then the final result will be the messages `LicenceReturnsImportProcess.go()` spits out. Else it will be
 * an empty array.
 *
 * @private
 */
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
    ) AND nal."LIC_NO" IN ('6/33/03/*G/0041', 'AN/033/0053/044R01', 'NW/068/0005/004', 'WA/055/0008/012', '6/33/03/*G/0012');
  `)
}

function _logMessages (results, index, licence, messages) {
  for (const result of results) {
    if (result.status === 'rejected') {
      global.GlobalNotifier.omg(`${STEP_NAME}: errored`, { index, licence, error })

      messages.push(`${licence.LIC_NO} errored: ${error.message}`)

      continue
    }

    messages.push(...result.value)
  }
}

async function _process () {
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
}

module.exports = {
  go
}
