'use strict'

const documentsConnector = require('../connectors/documents')

module.exports = async () => {
  try {
    global.GlobalNotifier.omg('import.delete-documents: started')

    return documentsConnector.deleteRemovedDocuments()
  } catch (error) {
    global.GlobalNotifier.omfg('import.delete-documents: errored', error)
    throw error
  }
}
