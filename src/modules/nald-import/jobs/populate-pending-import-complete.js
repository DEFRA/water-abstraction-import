'use strict'

const importLicenceJob = require('./import-licence')

async function handler (messageQueue, job) {
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
  handler
}
