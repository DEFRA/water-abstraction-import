'use strict'

const { pool } = require('../../../lib/connectors/db')
const Queries = require('../connectors/queries/clean-queries.js')
const ImportPurposeConditionTypesJob = require('./import-purpose-condition-types.js')

const JOB_NAME = 'licence-import.clean'

function createMessage () {
  return {
    name: JOB_NAME,
    options: {
      singletonKey: JOB_NAME,
      expireIn: '1 hours'
    }
  }
}

async function handler () {
  try {
    global.GlobalNotifier.omg(`${JOB_NAME}: started`)

    // Mark records in crm_v2.documents as deleted if the licence numbers no longer exist in import.NALD_ABS_LICENCES
    await pool.query(Queries.cleanCrmV2Documents)

    // Delete any licence monitoring stations linked to deleted NALD licence version purpose conditions
    await pool.query(Queries.cleanLicenceMonitoringStations)
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (messageQueue, job) {
  if (!job.failed) {
    await messageQueue.publish(ImportPurposeConditionTypesJob.createMessage())
  }

  global.GlobalNotifier.omg(`${JOB_NAME}: finished`)
}

module.exports = {
  createMessage,
  handler,
  onComplete,
  name: JOB_NAME
}
