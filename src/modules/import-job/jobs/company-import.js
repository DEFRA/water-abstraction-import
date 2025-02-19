'use strict'

const db = require('../../../lib/connectors/db.js')

const CompanyImportProcess = require('../../company-import/process.js')

const LinkToModLogsJob = require('./link-to-mod-logs.js')

const JOB_NAME = 'import-job.company-import'

function createMessage () {
  return {
    name: JOB_NAME,
    options: {
      expireIn: '1 hours',
      singletonKey: JOB_NAME
    }
  }
}

async function handler () {
  try {
    global.GlobalNotifier.omg(`${JOB_NAME}: started`)

    const pMap = (await import('p-map')).default

    const parties = await _parties()

    await pMap(parties, CompanyImportProcess.go, { concurrency: 10 })
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
  }
}

async function onComplete (messageQueue, job) {
  if (!job.data.failed) {
    await messageQueue.publish(LinkToModLogsJob.createMessage())

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
