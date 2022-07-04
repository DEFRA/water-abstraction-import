const extract = require('../extract')
const { logger } = require('../../../logger')

module.exports = async job => {
  try {
    logger.info('Importing licences')
    const rows = await extract.getAllLicenceNumbers()
    return rows
  } catch (err) {
    logger.error('Import licences error', err)
    throw err
  }
}
