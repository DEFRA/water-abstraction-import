const { pool } = require('../../../lib/connectors/db');
const chargingQueries = require('./queries/charging');
const purposesQueries = require('./queries/purposes');
const returnVersionQueries = require('./queries/return-versions');
const financialAgreementTypeQueries = require('./queries/financial-agreement-types');
const { logger } = require('../../../logger');
const checkIntegrity = require('./check-integrity');

const importQueries = [
  financialAgreementTypeQueries.importFinancialAgreementTypes,
  purposesQueries.importPrimaryPurposes,
  purposesQueries.importSecondaryPurposes,
  purposesQueries.importUses,
  purposesQueries.importValidPurposeCombinations,
  chargingQueries.createChargeVersionGuids,
  chargingQueries.createChargeElementGuids,
  chargingQueries.createChargeAgreementGuids,
  chargingQueries.importChargeVersions,
  chargingQueries.importChargeElements,
  chargingQueries.importChargeAgreements,
  chargingQueries.cleanupChargeElements,
  chargingQueries.cleanupChargeVersions,
  chargingQueries.updateChargeVersionsLicenceId,
  returnVersionQueries.importReturnVersions,
  returnVersionQueries.importReturnRequirements,
  returnVersionQueries.importReturnRequirementPurposes
];

/**
 * Run SQL queries to import charge versions / elements into
 * water service tables from NALD import tables
 * @return {Promise}
 */
const importChargingData = async () => {
  try {
    logger.info('Starting charge data import');

    for (const query of importQueries) {
      await pool.query(query);
    }

    logger.info('Charge data imported, verifying');

    const result = await checkIntegrity.verify();

    if (result.totalErrors > 0) {
      logger.error('Error in charge data import', result);
    }

    logger.info('Charge data import complete');
  } catch (err) {
    logger.error(err);
    throw err;
  }
};

exports.importChargingData = importChargingData;
