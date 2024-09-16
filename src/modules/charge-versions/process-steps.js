'use strict'

const db = require('../../lib/connectors/db.js')
const chargingQueries = require('./lib/queries/charging')
const chargeVersionMetadataImportService = require('./services/charge-version-metadata-import.js')
const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../lib/general.js')
const queryLoader = require('./lib/query-loader')
const transformPermit = require('./lib/transform-permit/transform-permit.js')

async function go () {
  let processComplete = false

  try {
    global.GlobalNotifier.omg('charge-versions started')

    const startTime = currentTimeInNanoseconds()

    const licenceNumbers = await _licenceNumbers()

    for (const licenceNumber of licenceNumbers) {
      const licenceData = await transformPermit.getLicenceJson(licenceNumber)

      await chargeVersionMetadataImportService.importChargeVersionMetadataForLicence(licenceData)
    }

    await queryLoader.loadQueries([
      chargingQueries.importChargeVersions,
      chargingQueries.importChargeElements,
      chargingQueries.cleanupChargeElements,
      chargingQueries.cleanupChargeVersions
    ])

    processComplete = true

    calculateAndLogTimeTaken(startTime, 'charge-versions complete')
  } catch (error) {
    global.GlobalNotifier.oops('charge-versions failed')
  }

  return processComplete
}

async function _licenceNumbers () {
  const query = 'SELECT "LIC_NO" FROM "import"."NALD_ABS_LICENCES";'

  return db.query(query)
}

module.exports = {
  go
}
