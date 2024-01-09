'use strict'

const assertImportTablesExist = require('../lib/assert-import-tables-exist')
const ImportLicenceJob = require('./import-licence')
const importService = require('../../../lib/services/import')

const JOB_NAME = 'nald-import.queue-licences'

function createMessage (replicateReturns) {
  return {
    name: JOB_NAME,
    options: {
      expireIn: '1 hours',
      singletonKey: JOB_NAME
    },
    data: {
      replicateReturns
    }
  }
}

async function handler () {
  try {
    global.GlobalNotifier.omg(`${JOB_NAME}: started`)

    await assertImportTablesExist.assertImportTablesExist()
    const licenceNumbers = await importService.getLicenceNumbers()

    return { licenceNumbers }
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (messageQueue, job) {
  if (!job.failed) {
    const { licenceNumbers } = job.data.response
    const numberOfJobs = licenceNumbers.length

    for (const [index, licenceNumber] of licenceNumbers.entries()) {
      // This information is to help us log when the import licence jobs start and finish. See
      // src/modules/nald-import/jobs/import-licence.js for more details
      const data = {
        licenceNumber,
        jobNumber: index + 1,
        numberOfJobs
      }
      await messageQueue.publish(ImportLicenceJob.createMessage(data))
    }
  }

  global.GlobalNotifier.omg(`${JOB_NAME}: finished`)
}

module.exports = {
  createMessage,
  handler,
  onComplete,
  name: JOB_NAME
}
