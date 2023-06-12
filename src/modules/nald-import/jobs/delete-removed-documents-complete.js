'use strict'

const populatePendingImportJob = require('./populate-pending-import')

async function handler (messageQueue, job) {
  // Publish a new job to populate pending import table but only if delete removed documents was successful
  if (!job.failed) {
    await messageQueue.publish(populatePendingImportJob.createMessage())
  }

  global.GlobalNotifier.omg('nald-import.delete-removed-documents: finished')
}

module.exports = {
  handler
}
