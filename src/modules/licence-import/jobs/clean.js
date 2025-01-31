'use strict'

const config = require('../../../../config')
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

    if (config.import.licences.isCleanLicenceImportsEnabled) {
      await _cleanDeletedLicences()
      await _cleanDeletedLicenceVersionData()
    }
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function _cleanDeletedLicences () {
  // NOTE: To improve performance these queries can all be run together as the data removed has no dependencies
  await Promise.all([
    // Delete any charge elements linked to deleted NALD licences
    pool.query(Queries.cleanChargeElements),

    // Delete any charge version notes linked to deleted NALD licences
    pool.query(Queries.cleanChargeVersionNotes),

    // Delete any licence agreements linked to deleted NALD licences
    pool.query(Queries.cleanLicenceAgreements),

    // Delete any licence document headers linked to deleted NALD licences
    pool.query(Queries.cleanLicenceDocumentHeaders),

    // Delete any licence document roles linked to deleted NALD licences
    pool.query(Queries.cleanLicenceDocumentRoles),

    // Delete any licence monitoring stations linked to deleted NALD licences
    pool.query(Queries.cleanLicenceMonitoringStations),

    // Delete any licence version purpose points linked to deleted NALD licences
    pool.query(Queries.cleanLicenceVersionPurposePoints),

    // Delete any workflows linked to deleted NALD licences
    pool.query(Queries.cleanLicenceWorkflows),

    // Delete any permit licences linked to deleted NALD licences
    pool.query(Queries.cleanPermitLicences)
  ])

  // Delete any licence version purpose conditions linked to deleted NALD licences
  await pool.query(Queries.cleanLicenceVersionPurposeConditions)

  // Delete any licence version purposes linked to deleted NALD licences
  await pool.query(Queries.cleanLicenceVersionPurposes)

  // Delete any licence versions linked to deleted NALD licences
  await pool.query(Queries.cleanLicenceVersions)

  // Delete any charge references linked to deleted NALD licences
  await pool.query(Queries.cleanChargeReferences)

  // Delete any charge versions linked to deleted NALD licences
  await pool.query(Queries.cleanChargeVersions)

  // Delete any licence documents linked to deleted NALD licences
  await pool.query(Queries.cleanLicenceDocuments)

  // Delete any licences linked to deleted NALD licences
  await pool.query(Queries.cleanLicences)
}

async function _cleanDeletedLicenceVersionData () {
  // Delete any soft deleted licence monitoring stations linked to deleted NALD licence version purpose conditions
  await pool.query(Queries.cleanLicenceMonitoringStationsPassTwo)

  // Delete any licence version purpose conditions linked to deleted NALD licence version purpose conditions
  await pool.query(Queries.cleanNaldLicenceVersionPurposeConditions)

  // Delete any licence version purpose points linked to deleted NALD licence version purpose points
  await pool.query(Queries.cleanNaldLicenceVersionPurposePoints)

  // Delete any licence version purposes linked to deleted NALD licence version purposes
  await pool.query(Queries.cleanNaldLicenceVersionPurposes)

  // Delete any workflows linked to deleted NALD licence versions
  await pool.query(Queries.cleanLicenceVersionWorkflows)

  // Delete any licence versions linked to deleted NALD licence versions
  await pool.query(Queries.cleanNaldLicenceVersions)
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
