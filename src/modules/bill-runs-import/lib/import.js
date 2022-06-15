'use strict';

const queries = require('./queries');
const slack = require('../../../lib/slack');
const { pool } = require('../../../lib/connectors/db');
const { logger } = require('../../../logger');

const createRow = (tableName, query) => ({
  tableName,
  query
});

const importQueries = [
  createRow('remove_constraints', queries.removeConstraints),
  createRow('billing_batches', queries.importNaldBillRuns),
  createRow('billing_invoices', queries.importNaldBillHeaders),
  createRow('billing_invoice_licences', queries.importInvoiceLicences),
  createRow('billing_transactions', queries.importTransactions),
  createRow('billing_resetSecondPartChargeFlag', queries.resetIsSecondPartChargeFlag),
  createRow('billing_setSecondPartChargeFlag', queries.setIsSecondPartChargeFlag),
  createRow('billing_volumes', queries.importBillingVolumes),
  createRow('billing_batch_charge_version_years', queries.importBillingBatchChargeVersionYears),
  createRow('add_constraints', queries.addConstraints)
];

/**
 * Logs a message and posts to Slack
 * @param {String} str - the message
 */
const log = str => {
  const message = `Bill run import: ${str}`;
  logger.info(message);
  slack.post(message);
};

/**
 * Run SQL queries to import bill runs to the water
 * billing tables.
 * It is envisaged this will only be run once in production
 *
 * @return {Promise}
 */
const importBillRuns = async () => {
  try {
    log('Starting...');

    for (const { tableName, query } of importQueries) {
      log(`Importing ${tableName}...`);
      await pool.query(query);
      log(`Imported ${tableName}.`);
    }

    log('Complete.');
  } catch (err) {
    log(err.message);
    throw err;
  }
};

module.exports = {
  importBillRuns
};
