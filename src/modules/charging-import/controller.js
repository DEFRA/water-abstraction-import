'use strict'

const chargeVersionsJob = require('./jobs/charge-versions')

/**
 * Run SQL queries to import charge versions / elements into
 * water service tables from NALD import tables
 * @return {Promise}
 */
const postImportChargingData = async (request, _h) => {
  await request.messageQueue.publish(chargeVersionsJob.createMessage())

  return {
    error: null
  }
}

module.exports = {
  postImportChargingData
}
