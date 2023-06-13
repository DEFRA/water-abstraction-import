'use strict'

const importLicenceJob = require('./import-licence')

async function handler (messageQueue, job) {
  if (!job.failed) {
    const { licenceNumbers } = job.data.response

    for (const licenceNumber of licenceNumbers) {
      await messageQueue.publish(importLicenceJob.createMessage(licenceNumber))
    }
  }

  global.GlobalNotifier.omg('nald-import.populate-pending-import: finished')
}

module.exports = {
  handler
}
