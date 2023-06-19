'use strict'

const chargeVersionsJob = require('./jobs/charge-versions')

/**
 * Run SQL queries to import charge versions / elements into
 * water service tables from NALD import tables
 * @return {Promise}
 */
const postImportChargingData = async (request, h) => {
  await request.messageQueue.deleteQueue(chargeVersionsJob.jobName)
  await request.messageQueue.publish(chargeVersionsJob.createMessage())

  return h.response().code(204)
}

module.exports = {
  postImportChargingData
}
