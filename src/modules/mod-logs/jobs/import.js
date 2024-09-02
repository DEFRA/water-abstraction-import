'use strict'

const { pool } = require('../../../lib/connectors/db.js')
const Queries = require('../lib/queries.js')

const JOB_NAME = 'mod-logs.import'

function createMessage () {
  return {
    name: JOB_NAME,
    options: {
      singletonKey: JOB_NAME
    }
  }
}

async function handler () {
  try {
    global.GlobalNotifier.omg(`${JOB_NAME}: started`)

    await pool.query(Queries.importModLogs)
    await pool.query(Queries.linkLicencesToModLogs)
    await pool.query(Queries.linkChargeVersionsToModLogs)
    await pool.query(Queries.linkLicenceVersionsToModLogs)
    await pool.query(Queries.linkReturnVersionsToModLogs)
    await pool.query(Queries.updateReturnVersionReasons)
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (job) {
  if (!job.failed) {
    global.GlobalNotifier.omg(`${JOB_NAME}: finished`)
  } else {
    global.GlobalNotifier.omg(`${JOB_NAME}: failed`)
  }
}

module.exports = {
  JOB_NAME,
  createMessage,
  handler,
  onComplete
}
