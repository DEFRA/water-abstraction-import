'use strict'

const { logger } = require('../../../logger')
const chargeVersionImportService = require('../services/charge-version-metadata-import')

/**
 * Run SQL queries to import charge versions / elements into
 * water service tables from NALD import tables
 * @return {Promise}
 */
const importChargeVersionMetadata = async () => {
  try {
    logger.info('Starting charge version metadata import')

    await chargeVersionImportService.importChargeVersionMetadata()

    logger.info('Charge version metadata import complete')
  } catch (err) {
    logger.error(err)
    throw err
  }
}

module.exports = {
  importChargeVersionMetadata
}
