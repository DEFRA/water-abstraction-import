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

    // Determine if the one-off pre-2013 NALD return lines extract exists
    const oldLinesExist = await _oldLinesExist()

    for (const [index, licence] of licences.entries()) {
      const data = {
        licence: { id: licence.ID, licenceRef: licence.LIC_NO, regionCode: licence.FGAC_REGION_CODE },
        jobNumber: index + 1,
        numberOfJobs,
        cleanReturnLogs: job.data.cleanReturnLogs,
        oldLinesExist
      }
      await messageQueue.publish(ImportJob.createMessage(data))
    }

    return numberOfJobs
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (job) {
  if (job.failed) {
    global.GlobalNotifier.omg(`${JOB_NAME}: failed`)

    return
  }

  global.GlobalNotifier.omg(`${JOB_NAME}: finished`, { queuedJobs: job.data.response.value })
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

async function _oldLinesExist () {
  const query = `
    SELECT
      EXISTS(
        SELECT
          1
        FROM
          information_schema.TABLES
        WHERE
          table_type = 'BASE TABLE'
          AND table_schema = 'public'
          AND table_name = 'NALD_RET_LINES'
      )::bool AS old_lines_exist
  `

  const results = await db.query(query)

  return results[0].old_lines_exist
}

module.exports = {
  JOB_NAME,
  createMessage,
  handler,
  onComplete
}
