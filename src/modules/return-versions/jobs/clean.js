'use strict'

const { pool } = require('../../../lib/connectors/db.js')
const Queries = require('../lib/clean-queries.js')
const ImportJob = require('./import.js')

const JOB_NAME = 'return-versions.clean'

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

    // Delete any return requirement points linked to deleted NALD return requirements
    await pool.query(Queries.cleanPoints)

    // Delete any return requirement purposes linked to deleted NALD return requirements
    await pool.query(Queries.cleanPurposes)

    // Delete any return requirements linked to deleted NALD return requirements
    await pool.query(Queries.cleanRequirements)

    // Delete any return versions that have no return requirements and that are linked to deleted return versions
    await pool.query(Queries.cleanVersions)

    // Update the mod logs to remove the return version ID for where the return version has now been deleted
    await pool.query(Queries.cleanModLogs)
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (messageQueue, job) {
  if (!job.failed) {
    await messageQueue.publish(ImportJob.createMessage())

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
