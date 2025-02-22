'use strict'

const db = require('../../../lib/connectors/db.js')

const LicenceLegacyImportProcess = require('../../licence-legacy-import/process.js')
const LicenceReturnsImportProcess = require('../../licence-returns-import/process.js')

const LicencePointsImportJob = require('./licence-points-import.js')

const JOB_NAME = 'import-job.licence-import'

function createMessage () {
  return {
    name: JOB_NAME,
    options: {
      expireIn: '2 hours',
      singletonKey: JOB_NAME
    }
  }
}

async function handler () {
  try {
    global.GlobalNotifier.omg(`${JOB_NAME}: started`)

    const licences = await _licences()

    for (const [index, licence] of licences.entries()) {
      const results = await Promise.allSettled([
        LicenceLegacyImportProcess.go(licence, index, false),
        LicenceReturnsImportProcess.go(licence, index, false)
      ])

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
    ) LIMIT 100;
  `)
}

module.exports = {
  JOB_NAME,
  createMessage,
  handler,
  onComplete
}
