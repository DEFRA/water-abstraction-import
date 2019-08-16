const { pool } = require('../../../lib/connectors/db');
const queries = require('./queries');
const { logger } = require('../../../logger');
const checkIntegrity = require('./check-integrity');

/**
 * Run SQL queries to import charge versions / elements into
 * water service tables from NALD import tables
 * @return {Promise}
 */
const importChargingData = async () => {
  logger.info(`Starting charge data import`);

  const arr = [
    queries.createChargeVersionGuids,
    queries.createChargeElementGuids,
    queries.createChargeAgreementGuids,
    queries.importChargeVersions,
    queries.importChargeElements,
    queries.importChargeAgreements
  ];

  for (let query of arr) {
    await pool.query(query);
  }

  logger.info(`Charge data imported, verifying`);

  const result = await checkIntegrity.verify();

  if (result.totalErrors > 0) {
    logger.error(`Error in charge data import`, result);
  }

  logger.info(`Charge data import complete`);
};

exports.importChargingData = importChargingData;
