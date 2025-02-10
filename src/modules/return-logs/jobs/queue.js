'use strict'

const db = require('../../../lib/connectors/db.js')
const ImportJob = require('./import.js')

const JOB_NAME = 'return-logs.queue'

function createMessage (cleanReturnLogs, licenceRef) {
  return {
    name: JOB_NAME,
    data: {
      licenceRef,
      cleanReturnLogs
    },
    options: {
      singletonKey: JOB_NAME
    }
  }
}

async function handler (messageQueue, job) {
  try {
    global.GlobalNotifier.omg(`${JOB_NAME}: started`)

    // Get _all_ licences in NALD
    const licences = await _licences(job.data.licenceRef)
    const numberOfJobs = licences.length

    for (const [index, licence] of licences.entries()) {
      const data = {
        licence: { id: licence.ID, licenceRef: licence.LIC_NO, regionCode: licence.FGAC_REGION_CODE },
        jobNumber: index + 1,
        numberOfJobs,
        cleanReturnLogs: job.data.cleanReturnLogs
      }
      await messageQueue.publish(ImportJob.createMessage(data))
    }

    return numberOfJobs
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function _licences (licenceRef) {
  if (licenceRef) {
    return db.query(
      'SELECT nal."ID", nal."LIC_NO", nal."FGAC_REGION_CODE" FROM "import"."NALD_ABS_LICENCES" nal WHERE nal."LIC_NO" = $1;',
      [licenceRef]
    )
  }

  return db.query('SELECT nal."ID", nal."LIC_NO", nal."FGAC_REGION_CODE" FROM "import"."NALD_ABS_LICENCES" nal;')
}

async function onComplete (job) {
  if (job.failed) {
    global.GlobalNotifier.omg(`${JOB_NAME}: failed`)

    return
  }

  global.GlobalNotifier.omg(`${JOB_NAME}: finished`, { queuedJobs: job.data.response.value })
}

module.exports = {
  JOB_NAME,
  createMessage,
  handler,
  onComplete
}
