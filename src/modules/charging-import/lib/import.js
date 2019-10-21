const { pool } = require('../../../lib/connectors/db');
const chargingQueries = require('./queries/charging');
const purposesQueries = require('./queries/purposes');
const financialAgreementTypeQueries = require('./queries/financial-agreement-types');
const { logger } = require('../../../logger');
const checkIntegrity = require('./check-integrity');
const importLicenceAgreements = require('./import-licence-agreements');

const runQueries = async () => {
  const arr = [
    financialAgreementTypeQueries.importFinancialAgreementTypes,
    purposesQueries.importPrimaryPurposes,
    purposesQueries.importSecondaryPurposes,
    purposesQueries.importUses,
    chargingQueries.createChargeVersionGuids,
    chargingQueries.createChargeElementGuids,
    chargingQueries.createChargeAgreementGuids,
    chargingQueries.importChargeVersions,
    chargingQueries.importChargeElements,
    chargingQueries.importChargeAgreements,
    chargingQueries.cleanupChargeAgreements,
    chargingQueries.cleanupChargeElements,
    chargingQueries.cleanupChargeVersions
  ];

  for (const query of arr) {
    await pool.query(query);
  }
};

/**
 * Run SQL queries to import charge versions / elements into
 * water service tables from NALD import tables
 * @return {Promise}
 */
const importChargingData = async () => {
  logger.info(`Starting charge data import`);

  await runQueries();
  await importLicenceAgreements.importLicenceAgreements();

  logger.info(`Charge data imported, verifying`);

  const result = await checkIntegrity.verify();

  if (result.totalErrors > 0) {
    logger.error(`Error in charge data import`, result);
  }

  logger.info(`Charge data import complete`);
};

exports.importChargingData = importChargingData;
