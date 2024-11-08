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

    if (process.env.CLEAN_LICENCE_IMPORTS === 'true') {
      // Delete any licence monitoring stations linked to deleted NALD licence version purpose conditions
      await pool.query(Queries.cleanLicenceMonitoringStations)

      // Delete any licence version purpose conditions linked to deleted NALD licence version purpose conditions
      await pool.query(Queries.cleanLicenceVersionPurposeConditions)

      // Delete any licence version purpose points linked to deleted NALD licence version purposes
      await pool.query(Queries.cleanLicenceVersionPurposePoints)

      // Delete any licence version purposes linked to deleted NALD licence version purposes
      await pool.query(Queries.cleanLicenceVersionPurposes)

      // Delete any Workflows linked to deleted NALD licence versions
      await pool.query(Queries.cleanWorkflows)

      // Delete any licence versions linked to deleted NALD licence versions
      await pool.query(Queries.cleanLicenceVersions)

      // NOTE: Licences are removed if they no longer exist in NALD, are not in a bill run and have no return versions
      // Delete any charge elements linked to deleted NALD licences
      await pool.query(Queries.cleanChargeElements)

      // Delete any charge references linked to deleted NALD licences
      await pool.query(Queries.cleanChargeReferences)

      // Delete any charge version notes linked to deleted NALD licences
      await pool.query(Queries.cleanChargeVersionNotes)

      // Delete any charge versions linked to deleted NALD licences
      await pool.query(Queries.cleanChargeVersions)

      // Delete any licence agreements linked to deleted NALD licences
      await pool.query(Queries.cleanLicenceAgreements)

      // Delete any licence document headers linked to deleted NALD licences
      await pool.query(Queries.cleanLicenceDocumentHeaders)

      // Delete any licence document roles linked to deleted NALD licences
      await pool.query(Queries.cleanLicenceDocumentRoles)

      // Delete any licence documents linked to deleted NALD licences
      await pool.query(Queries.cleanLicenceDocuments)
    }
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
