'use strict'

const db = require('../../../lib/connectors/db.js')

const CompanyImportJob = require('./company-import.js')

const JOB_NAME = 'import-job.queue-company-import'

function createMessage () {
  return {
    name: JOB_NAME,
    options: {
      singletonKey: JOB_NAME
    }
  }
}

async function handler (messageQueue) {
  try {
    global.GlobalNotifier.omg(`${JOB_NAME}: started`)

    // Get _all_ parties in NALD
    const parties = await _parties()
    const numberOfJobs = parties.length

    for (const [index, party] of parties.entries()) {
      const data = {
        jobNumber: index + 1,
        numberOfJobs,
        party
      }

      await messageQueue.publish(CompanyImportJob.createMessage(data))
    }

    return numberOfJobs
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (job) {
  if (job.data.failed) {
    global.GlobalNotifier.omg(`${JOB_NAME}: failed`)

    return
  }

  global.GlobalNotifier.omg(`${JOB_NAME}: finished`, { queuedJobs: job.data.response.value })
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
      "import"."NALD_PARTIES"
    LIMIT 200;
  `)
}

module.exports = {
  JOB_NAME,
  createMessage,
  handler,
  onComplete
}
