'use strict';

const mapper = require('../mappers/charge-versions');

const queries = {
  charging: require('../lib/queries/charging'),
  licence: require('../lib/queries/licences'),
  changeReasons: require('../lib/queries/change-reasons')
};

const { logger } = require('../../../logger');

const { pool } = require('../../../lib/connectors/db');

/**
 * Gets charge versions for licence from DB
 * @param {Number} regionCode
 * @param {Number} licenceId
 * @return {Promise<Object>}
 */
const getNonDraftChargeVersions = (regionCode, licenceId) =>
  pool.query(queries.charging.getNonDraftChargeVersionsForLicence, [regionCode, licenceId]);

/**
  * Gets the GUID of the "NALD Gap" change reason in the water service
  * @return {Promise<Number>}
  */
const getChangeReasonId = async () => {
  const { rows: [changeReason] } = await pool.query(queries.changeReasons.getNALDGapChangeReason);
  return changeReason.change_reason_id;
};

/**
 * Inserts a single charge version record into the water.charge_versions DB table
 * @param {Object} chargeVersion
 * @return {Promise}
 */
const insertChargeVersion = chargeVersion => {
  const params = [
    chargeVersion.start_date,
    chargeVersion.end_date,
    chargeVersion.status,
    chargeVersion.licence_ref,
    chargeVersion.region,
    chargeVersion.source,
    chargeVersion.version_number,
    chargeVersion.invoice_account_id,
    chargeVersion.company_id,
    chargeVersion.billed_upto_date,
    chargeVersion.error,
    chargeVersion.scheme,
    chargeVersion.external_id,
    chargeVersion.apportionment,
    chargeVersion.change_reason_id || null,
    chargeVersion.licence_id
  ];
  return pool.query(queries.charging.insertChargeVersion, params);
};

const createParam = i => `$${i + 1}`;

/**
 * Cleans up nald charge versions no longer needed
 * @param {Object} licence
 * @param {Object} chargeVersions
 * @return {Promise}
 */
const cleanup = (licence, chargeVersions) => {
  const params = [licence.LIC_NO];
  const externalIds = chargeVersions.map(chargeVersion => chargeVersion.external_id);
  let query = "delete from water.charge_versions where licence_ref=$1 and source='nald'";

  if (externalIds.length) {
    params.push(...externalIds);
    query += ` and external_id not in (${externalIds.map((row, i) => createParam(i + 1))})`;
  }
  return pool.query(query, params);
};

const persistChargeVersions = async wrlsChargeVersions => {
  // Insert to water.charge_versions DB table
  for (const wrlsChargeVersion of wrlsChargeVersions) {
    await insertChargeVersion(wrlsChargeVersion);
  }
};

const importChargeVersions = async () => {
  const changeReasonId = await getChangeReasonId();

  const { rows: licences } = await pool.query(queries.licence.getLicences);

  for (const licence of licences) {
    try {
      // Note: charge versions are already sorted by start date, version number from the DB query
      const { rows: chargeVersions } = await getNonDraftChargeVersions(licence.FGAC_REGION_CODE, licence.ID);

      // Map to WRLS charge versions
      const wrlsChargeVersions = mapper.mapNALDChargeVersionsToWRLS(licence, chargeVersions, changeReasonId);

      await Promise.all([
        persistChargeVersions(wrlsChargeVersions),
        cleanup(licence, wrlsChargeVersions)
      ]);
    } catch (err) {
      logger.error(`Error importing charge versions for licence ${licence.LIC_NO}`, err);
    }
  }
};

exports.importChargeVersions = importChargeVersions;
