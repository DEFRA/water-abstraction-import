'use strict'

const mapper = require('../mappers/charge-versions')

const queries = {
  charging: require('../lib/nald-queries/charge-versions'),
  chargeVersionMetatdata: require('../lib/nald-queries/charge-versions-metadata')
}

const { logger } = require('../../../logger')
const { pool } = require('../../../lib/connectors/db')

/**
 * Gets charge versions for licence from DB
 * @param {Number} regionCode
 * @param {Number} licenceId
 * @return {Promise<Object>}
 */
const getNonDraftChargeVersions = (regionCode, licenceId) =>
  pool.query(queries.charging.getNonDraftChargeVersionsForLicence, [regionCode, licenceId])

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
  try {
    logger.info(`Import: charge versions metadata for licence ${licence.LIC_NO}`)

    // Note: charge versions are already sorted by start date, version number from the DB query
    const { rows: chargeVersions } = await getNonDraftChargeVersions(licence.FGAC_REGION_CODE, licence.ID)

    // Map to WRLS charge versions
    const wrlsChargeVersions = mapper.mapNALDChargeVersionsToWRLS(licence, chargeVersions)

    await persistChargeVersionMetadata(wrlsChargeVersions)
    await cleanup(licence, wrlsChargeVersions)
  } catch (err) {
    logger.error(`Error importing charge versions for licence ${licence.LIC_NO}`, err)
  }
}

module.exports = {
  importChargeVersionMetadataForLicence
}
