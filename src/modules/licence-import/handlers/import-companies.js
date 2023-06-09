'use strict'

const importCompanies = require('../connectors/import-companies')

module.exports = async () => {
  try {
    global.GlobalNotifier.omg('import.companies: started')

    await importCompanies.clear()
    const data = await importCompanies.initialise()

    return data.map((row) => {
      return {
        regionCode: parseInt(row.region_code),
        partyId: parseInt(row.party_id)
      }
    })
  } catch (error) {
    global.GlobalNotifier.omfg('import.companies: errored', error)
    throw error
  }
}
