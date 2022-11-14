'use strict'

const extract = require('../extract')
const transform = require('../transform')
const load = require('../load')
const { logger } = require('../../../logger')
const importCompanies = require('../connectors/import-companies')

module.exports = async job => {
  try {
    const { regionCode, partyId } = job.data
    logger.info(`Import company ${regionCode} ${partyId}`)

    // Extract data
    const data = await extract.getCompanyData(regionCode, partyId)

    // Transform to new structure
    const mapped = transform.company.transformCompany(data)

    // Load to CRM database
    await load.company.loadCompany(mapped)

    await importCompanies.setImportedStatus(regionCode, partyId)
  } catch (err) {
    logger.error('Import company error', err.stack)
    throw err
  }
}
