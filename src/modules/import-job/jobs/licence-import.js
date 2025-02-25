'use strict'

const db = require('../../../lib/connectors/db.js')

const LicenceCrmImportProcess = require('../../licence-crm-import/process.js')
const LicenceCrmV2ImportProcess = require('../../licence-crm-v2-import/process.js')
const LicencePermitImportProcess = require('../../licence-permit-import/process.js')
const LicenceReturnsImportProcess = require('../../licence-returns-import/process.js')
const PermitTransformer = require('../../licence-permit-import/lib/permit-transformer.js')

const LicencePointsImportJob = require('./licence-points-import.js')

const JOB_NAME = 'import-job.licence-import'

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

    for (const [index, licence] of licences.entries()) {
      const permitData = await PermitTransformer.go(licence)

      const results = await Promise.allSettled([
        LicencePermitImportProcess.go(permitData, index, false),
        LicenceCrmV2ImportProcess.go(permitData, index, false),
        LicenceReturnsImportProcess.go(licence, index, false)
      ])

      // This has to be persisted after LicencePermitImportProcess completes, because it depends on an ID it generates
      // for new licences
      await LicenceCrmImportProcess.go(permitData, index, false)

      _logLicenceErrors(results, index, licence)
    }
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (messageQueue, job) {
  if (!job.data.failed) {
    // await messageQueue.publish(LicencePointsImportJob.createMessage())

    global.GlobalNotifier.omg(`${JOB_NAME}: finished`)
  } else {
    global.GlobalNotifier.omg(`${JOB_NAME}: failed`)
  }
}

function _logLicenceErrors (results, index, licence) {
  const errors = results.filter((result) => {
    return result.status === 'rejected'
  })

  for (const error of errors) {
    global.GlobalNotifier.omg(`${JOB_NAME}: errored`, { index, licence, error })
  }
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
    ) LIMIT 5000;
  `)
}

module.exports = {
  JOB_NAME,
  createMessage,
  handler,
  onComplete
}
