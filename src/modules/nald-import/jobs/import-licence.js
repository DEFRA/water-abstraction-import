'use strict'

const assertImportTablesExist = require('../lib/assert-import-tables-exist')
const licenceLoader = require('../load')

const JOB_NAME = 'nald-import.import-licence'

const options = {
  teamSize: 75,
  teamConcurrency: 1
}

const createMessage = (licenceNumber) => ({
  name: JOB_NAME,
  data: { licenceNumber },
  options: {
    singletonKey: licenceNumber
  }
})

/**
 * Imports a single licence
 * @param {Object} job
 * @param {String} job.data.licenceNumber
 */
const handler = async (job) => {
  try {
    await assertImportTablesExist.assertImportTablesExist()

    // Import the licence
    await licenceLoader.load(job.data.licenceNumber)
  } catch (error) {
    global.GlobalNotifier.omfg('nald-import.import-licence: errored', error)
    throw error
  }
}

module.exports = {
  createMessage,
  handler,
  jobName: JOB_NAME,
  options
}
