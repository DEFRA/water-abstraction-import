'use strict'

const db = require('../../../lib/connectors/db.js')

const CrmV2ImportProcess = require('../../crm-v2-import/process.js')

const LicenceDataImportJob = require('./licence-data-import.js')

const JOB_NAME = 'import-job.crm-v2-import'

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

    const pMap = (await import('p-map')).default

    const parties = await _parties()

    await pMap(parties, CrmV2ImportProcess.go, { concurrency: 10 })
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
  }
}

async function onComplete (messageQueue, job) {
  if (!job.data.failed) {
    await messageQueue.publish(LicenceDataImportJob.createMessage())

    global.GlobalNotifier.omg(`${JOB_NAME}: finished`)
  } else {
    global.GlobalNotifier.omg(`${JOB_NAME}: failed`)
  }
}

async function _parties () {
  return db.query(`
    SELECT
      "ID",
      "APAR_TYPE",
      "NAME",
      "FORENAME",
      "INITIALS",
      "SALUTATION",
      "FGAC_REGION_CODE"
    FROM
      "import"."NALD_PARTIES";
  `)
}

module.exports = {
  JOB_NAME,
  createMessage,
  handler,
  onComplete
}
