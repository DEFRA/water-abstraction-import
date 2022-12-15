'use strict'

const chargeVersionsJob = require('./jobs/charge-versions')

const createPostHandler = async (createMessage, request) => {
  await request.messageQueue.publish(createMessage())

  return {
    error: null
  }
}

const partial =
(func, ...args) =>
  (...furtherArgs) =>
    func(...args, ...furtherArgs)

/**
 * Run SQL queries to import charge versions / elements into
 * water service tables from NALD import tables
 * @return {Promise}
 */
const postImportChargingData = partial(createPostHandler, chargeVersionsJob.createMessage)

module.exports = {
  postImportChargingData
}
