'use strict';

const { pool } = require('../../../lib/connectors/db');
const chargingQueries = require('./queries/charging');
const purposesQueries = require('./queries/purposes');
const returnVersionQueries = require('./queries/return-versions');
const financialAgreementTypeQueries = require('./queries/financial-agreement-types');
const { logger } = require('../../../logger');
const chargeVersionImportService = require('../services/charge-version-metadata-import');

const importQueries = [
  financialAgreementTypeQueries.importFinancialAgreementTypes,
  purposesQueries.importPrimaryPurposes,
  purposesQueries.importSecondaryPurposes,
  purposesQueries.importUses,
  purposesQueries.importValidPurposeCombinations,
  chargingQueries.importChargeElements,
  chargingQueries.cleanupChargeElements,
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

    await chargeVersionImportService.importChargeVersions();

    for (const query of importQueries) {
      await pool.query(query);
    }

    logger.info('Charge data import complete');
  } catch (err) {
    logger.error(err);
    throw err;
  }
};

exports.importChargingData = importChargingData;
