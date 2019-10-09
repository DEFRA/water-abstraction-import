const { pool } = require('../../../lib/connectors/db');
const documentQueries = require('./queries/documents');
const { logger } = require('../../../logger');

/**
 * Run SQL queries to import charge versions / elements into
 * water service tables from NALD import tables
 * @return {Promise}
 */
const importCRMData = async () => {
  logger.info(`Starting CRM data import`);

  const arr = [
    documentQueries.importDocumentHeaders
  ];

  for (const query of arr) {
    await pool.query(query);
  }

  logger.info(`CRM data imported`);
};

exports.importCRMData = importCRMData;
