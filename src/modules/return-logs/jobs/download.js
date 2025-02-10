'use strict'

const db = require('../../../lib/connectors/db.js')
const QueueJob = require('./queue.js')

const JOB_NAME = 'return-logs.download'

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

async function handler (job) {
  try {
    global.GlobalNotifier.omg(`${JOB_NAME}: started`)

    // Determine if the one-off pre-2013 NALD return lines extract exists
    const oldLinesExist = await _oldLinesExist()

    return oldLinesExist
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (messageQueue, job) {
  if (!job.failed) {
    const oldLinesExist = job.data.response.value
    const { cleanReturnLogs, licenceRef } = job.data.request.data

    await messageQueue.publish(QueueJob.createMessage(cleanReturnLogs, oldLinesExist, licenceRef))
  }

  global.GlobalNotifier.omg(`${JOB_NAME}: finished`)
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
