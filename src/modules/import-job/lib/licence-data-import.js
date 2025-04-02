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

async function _process () {
  const pMap = (await import('p-map')).default

  const licences = await _licences()

  const allMessages = await pMap(licences, _processLicence, { concurrency: 5 })

  if (config.featureFlags.disableReturnsImports) {
    allMessages.push('Skipped licence-returns-import because importing returns is disabled')
  }

  return allMessages.flat()
}

async function _processLicence (licence) {
  const messages = []

  let processMessages

  try {
    const permitJson = await PermitJson.go(licence)

    processMessages = await LicencePermitImportProcess.go(permitJson, false)
    messages.push(processMessages)

    processMessages = await LicenceCrmV2ImportProcess.go(permitJson, false)
    messages.push(processMessages)

    processMessages = await LicenceNoStartDateImportProcess.go(permitJson, false)
    messages.push(processMessages)

    processMessages = await LicenceCrmImportProcess.go(permitJson, false)
    messages.push(processMessages)

    if (!config.featureFlags.disableReturnsImports) {
      processMessages = await LicenceReturnsImportProcess.go(licence, false)
      messages.push(processMessages)
    }
  } catch (err) {
    global.GlobalNotifier.omg(`import-job.${STEP_NAME}: errored`, { licence, err })
    messages.push(err.message)
  }

  return messages
}

module.exports = {
  go
}
