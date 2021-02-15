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
  createRow('NALD_BILL_RUNS', queries.importNaldBillRuns)
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

exports.importBillRuns = importBillRuns;