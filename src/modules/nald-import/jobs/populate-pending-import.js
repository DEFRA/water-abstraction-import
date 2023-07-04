'use strict'

const assertImportTablesExist = require('../lib/assert-import-tables-exist')
const importLicenceJob = require('./import-licence')
const importService = require('../../../lib/services/import')

const JOB_NAME = 'nald-import.populate-pending-import'

function createMessage () {
  return {
    name: JOB_NAME,
    options: {
      expireIn: '1 hours',
      singletonKey: JOB_NAME
    }
  }
}

async function handler () {
  try {
    global.GlobalNotifier.omg('nald-import.populate-pending-import: started')

    await assertImportTablesExist.assertImportTablesExist()
    const licenceNumbers = await importService.getLicenceNumbers()

    return { licenceNumbers }
  } catch (error) {
    global.GlobalNotifier.omfg('nald-import.populate-pending-import: errored', error)
    throw error
  }
}

async function onComplete (messageQueue, job) {
  if (!job.failed) {
    const { licenceNumbers } = job.data.response
    const numberOfLicences = licenceNumbers.length

    for (const [index, licenceNumber] of licenceNumbers.entries()) {
      // This information is to help us log when the import licence jobs start and finish. See
      // src/modules/nald-import/jobs/import-licence.js for more details
      const data = {
        licenceNumber,
        jobNumber: index + 1,
        numberOfLicences
      }
      await messageQueue.publish(importLicenceJob.createMessage(data))
    }
  }

  global.GlobalNotifier.omg('nald-import.populate-pending-import: finished')
}

module.exports = {
  createMessage,
  handler,
  onComplete,
  name: JOB_NAME
}
