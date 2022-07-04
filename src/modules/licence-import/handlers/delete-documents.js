const { logger } = require('../../../logger')
const documentsConnector = require('../connectors/documents')

module.exports = async job => {
  try {
    logger.info('Deleting removed documents')
    return documentsConnector.deleteRemovedDocuments()
  } catch (err) {
    logger.error('Failed to delete removed documents', err)
    throw err
  }
}
