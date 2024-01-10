'use strict'

const chargeVersionsJob = require('./jobs/charge-versions')
const chargingDataJob = require('./jobs/charging-data.js')

/**
 * Run SQL queries to import charge versions / elements into
 * water service tables from NALD import tables
 * @return {Promise}
 */
const postImportChargeVersions = async (request, h) => {
  await request.messageQueue.deleteQueue(chargeVersionsJob.jobName)
  await request.messageQueue.publish(chargeVersionsJob.createMessage())

  return h.response().code(204)
}

const postImportChargingData = async (request, h) => {
  await request.messageQueue.deleteQueue(chargingDataJob.jobName)
  await request.messageQueue.publish(chargingDataJob.createMessage())

  return h.response().code(204)
}

module.exports = {
  postImportChargeVersions,
  postImportChargingData
}
