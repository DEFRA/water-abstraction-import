'use strict'

const populatePendingImportJob = require('./populate-pending-import')

const deleteRemovedDocumentsComplete = async (messageQueue) => {
  // Publish a new job to populate pending import table
  await messageQueue.publish(populatePendingImportJob.createMessage())

  global.GlobalNotifier.omg('nald-import.delete-removed-documents: finished')
}

module.exports = deleteRemovedDocumentsComplete
