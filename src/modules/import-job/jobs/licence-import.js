'use strict'

const db = require('../../../lib/connectors/db.js')

const CrmPermitImportProcess = require('../..//crm-permit-import/process.js')

const LinkToModLogsJob = require('./link-to-mod-logs.js')

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
      await CrmPermitImportProcess.go(licence, index, false)
    }
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (messageQueue, job) {
  if (!job.data.failed) {
    // await messageQueue.publish(LinkToModLogsJob.createMessage())

    global.GlobalNotifier.omg(`${JOB_NAME}: finished`)
  } else {
    global.GlobalNotifier.omg(`${JOB_NAME}: failed`)
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
    );
  `)
}

module.exports = {
  JOB_NAME,
  createMessage,
  handler,
  onComplete
}
