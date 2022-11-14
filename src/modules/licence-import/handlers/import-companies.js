const { logger } = require('../../../logger')
const importCompanies = require('../connectors/import-companies')

const mapRow = row => ({
  regionCode: parseInt(row.region_code),
  partyId: parseInt(row.party_id)
})

module.exports = async job => {
  try {
    logger.info('Import companies')
    await importCompanies.clear()
    const data = await importCompanies.initialise()
    return data.map(mapRow)
  } catch (err) {
    logger.error('Import companies error', err.stack)
    throw err
  }
}
