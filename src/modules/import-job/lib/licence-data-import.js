'use strict'

const db = require('../../../lib/connectors/db.js')
const { currentTimeInNanoseconds, durations } = require('../../../lib/general.js')
const LicenceCrmImportProcess = require('../../licence-crm-import/process.js')
const LicenceCrmV2ImportProcess = require('../../licence-crm-v2-import/process.js')
const LicenceNoStartDateImportProcess = require('../../licence-no-start-date-import/process.js')
const LicencePermitImportProcess = require('../../licence-permit-import/process.js')
const PermitJson = require('../../../lib/permit-json/permit-json.js')

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

function _displayProgress (licence) {
  const { LIC_NO, row_index: rowIndex } = licence

  if (rowIndex % 1000 === 0) {
    global.GlobalNotifier.omg(
      `import-job.${STEP_NAME}: progress (${rowIndex})`,
      { lastLicence: LIC_NO }
    )
  }
}

async function _licences () {
  return db.query(`
    SELECT
      row_number() over() AS row_index,
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

  return allMessages.flat()
}

async function _processLicence (licence) {
  const messages = []

  let processMessages

  try {
    const permitJson = await PermitJson.go(licence)

    processMessages = await LicencePermitImportProcess.go(permitJson, false)
    messages.push(...processMessages)

    processMessages = await LicenceCrmV2ImportProcess.go(permitJson, false)
    messages.push(...processMessages)

    processMessages = await LicenceNoStartDateImportProcess.go(permitJson, false)
    messages.push(...processMessages)

    processMessages = await LicenceCrmImportProcess.go(permitJson, false)
    messages.push(...processMessages)

    _displayProgress(licence)
  } catch (err) {
    global.GlobalNotifier.omg(`import-job.${STEP_NAME}: errored`, { licence, err })
    messages.push(err.message)
  }

  return messages
}

module.exports = {
  go
}
