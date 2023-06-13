'use strict'

const JOB_NAME = 'nald-import.delete-removed-documents'
const importService = require('../../../lib/services/import')

const createMessage = () => ({
  name: JOB_NAME,
  options: {
    expireIn: '1 hours',
    singletonKey: JOB_NAME
  }
})

const handler = async () => {
  try {
    global.GlobalNotifier.omg('nald-import.delete-removed-documents: started')

    return importService.deleteRemovedDocuments()
  } catch (error) {
    global.GlobalNotifier.omfg('nald-import.delete-removed-documents: errored', error)
    throw error
  }
}

module.exports = {
  createMessage,
  handler,
  jobName: JOB_NAME
}
