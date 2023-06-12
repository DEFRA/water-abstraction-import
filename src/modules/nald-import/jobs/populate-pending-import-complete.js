'use strict'

const importLicenceJob = require('./import-licence')

const importLicenceComplete = async (messageQueue, job) => {
  const { licenceNumbers } = job.data.response

  for (const licenceNumber of licenceNumbers) {
    await messageQueue.publish(importLicenceJob.createMessage(licenceNumber))
  }

  global.GlobalNotifier.omg('nald-import.populate-pending-import: finished')
}

module.exports = importLicenceComplete
