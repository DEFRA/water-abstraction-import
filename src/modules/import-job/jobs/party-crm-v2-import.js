'use strict'

const db = require('../../../lib/connectors/db.js')

const PartyCrmV2ImportProcess = require('../../party-crm-v2-import/process.js')

const LicenceDataImportJob = require('./licence-data-import.js')

const JOB_NAME = 'import-job.party-crm-v2-import'

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

    const allMessages = await pMap(parties, PartyCrmV2ImportProcess.go, { concurrency: 10 })

    return allMessages.flat()
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
  }
}

async function onComplete (messageQueue, job) {
  const state = job.data.failed ? 'failed' : 'completed'

  global.GlobalNotifier.omg(`${JOB_NAME}: ${state}`)

  await messageQueue.publish(LicenceDataImportJob.createMessage())
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
