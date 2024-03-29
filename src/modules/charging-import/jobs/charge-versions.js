'use strict'

/**
 * Creates new PRESROC `water.charge_versions` records or updates existing ones based on `import.NALD_CHG_VERSIONS`
 * @module ChargeVersionsJob
 *
 * The job was written as a one-off to create the charge version records WRLS billing needed when it first went live.
 * It was written at a time there was only the PRESROC scheme.
 *
 * Now we have SROC and this process (creating the `water_import.charge_versions_metadata` source data and then
 * updating `water.charge_versions` using it) has no knowledge of it. Nor does NALD for that matter. A completely
 * different one-off mechanism (the charge version upload in water-abstraction-service) was built to handle creating
 * the SROC charge versions needed to support SROC billing.
 *
 * When devs and testers build or rebuild a local environment you still need to manually trigger this redundant import
 * job to create your base PRESROC charge versions. But it only deals with PRESROC. Any licences with a start date
 * after 2022-04-01 will need you to manually create their charge versions.
 */

const chargingQueries = require('../lib/queries/charging')
const chargeVersionMetadataImportService = require('../services/charge-version-metadata-import.js')
const importService = require('../../../lib/services/import.js')
const job = require('../lib/job')
const queryLoader = require('../lib/query-loader')
const transformPermit = require('../../nald-import/transform-permit.js')

const jobName = 'import.charge-versions'

const createMessage = () => job.createMessage(jobName)

const handler = async () => {
  try {
    global.GlobalNotifier.omg('import.charge-versions: started')

    const licenceNumbers = await importService.getLicenceNumbers()

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
    global.GlobalNotifier.omg('import.charge-versions: finished')
  } catch (error) {
    global.GlobalNotifier.omfg('import.charge-versions: errored', error)
    throw error
  }
}

module.exports = {
  jobName,
  createMessage,
  handler
}
