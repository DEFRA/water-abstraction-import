'use strict'

const mapper = require('../mappers/charge-versions.js')
const { pool } = require('../../../lib/connectors/db')
const queries = {
  chargeVersions: require('../lib/queries/charge-versions.js'),
  chargeVersionMetatdata: require('../lib/queries/charge-versions-metadata.js')
}

/**
 * Gets charge versions for licence from DB
 * @param {Number} regionCode
 * @param {Number} licenceId
 * @return {Promise<Object>}
 */
const getNonDraftChargeVersions = (regionCode, licenceId) =>
  pool.query(queries.chargeVersions.getNonDraftChargeVersionsForLicence, [regionCode, licenceId])

/**
 * Inserts a single charge version record into the water.charge_versions DB table
 * @param {Object} chargeVersion
 * @return {Promise}
 */
const insertChargeVersionMetadata = chargeVersion => {
  const params = [
    chargeVersion.external_id,
    chargeVersion.version_number,
    chargeVersion.start_date,
    chargeVersion.end_date,
    chargeVersion.status,
    chargeVersion.is_nald_gap || false
  ]
  return pool.query(queries.chargeVersionMetatdata.insertChargeVersionMetadata, params)
}

const createParam = i => `$${i + 1}`

/**
 * Cleans up nald charge versions no longer needed
 * @param {Object} licence
 * @param {Object} chargeVersions
 * @return {Promise}
 */
const cleanup = (licence, chargeVersions) => {
  const params = [`${licence.FGAC_REGION_CODE}:${licence.ID}:%`]
  const externalIds = chargeVersions.map(chargeVersion => chargeVersion.external_id)
  let query = 'delete from water_import.charge_versions_metadata where external_id like $1'

  if (externalIds.length) {
    params.push(...externalIds)
    query += ` and external_id not in (${externalIds.map((row, i) => createParam(i + 1))})`
  }
  return pool.query(query, params)
}

const persistChargeVersionMetadata = async wrlsChargeVersions => {
  // Insert to water.charge_versions DB table
  for (const wrlsChargeVersion of wrlsChargeVersions) {
    await insertChargeVersionMetadata(wrlsChargeVersion)
  }
}

const importChargeVersionMetadataForLicence = async licence => {
  // Note: charge versions are already sorted by start date, version number from the DB query
  const { rows: chargeVersions } = await getNonDraftChargeVersions(licence.FGAC_REGION_CODE, licence.ID)

  // Stop here if there are no NALD charge versions (NALD_CHG_VERSIONS)
  if (!chargeVersions || chargeVersions.length === 0) {
    return
  }

  // Map to WRLS charge versions
  const wrlsChargeVersions = mapper.mapNALDChargeVersionsToWRLS(licence, chargeVersions)

  await persistChargeVersionMetadata(wrlsChargeVersions)
  await cleanup(licence, wrlsChargeVersions)
}

module.exports = {
  importChargeVersionMetadataForLicence
}
