'use strict';

const { pool } = require('../../../lib/connectors/db');
const { logger } = require('../../../logger');
const slack = require('../../../lib/slack');

const log = msg => {
  logger.info(msg);
  slack.post(msg);
};

/**
 * Generic means of running a sequence of queries in series,
 * logging progress to console/Slack
 *
 * @param {String} name - friendly name for log messages
 * @param {Array<String>} queries - array of SQL queries to run
 * @returns {Promise}
 */
const loadQueries = async (name, queries) => {
  try {
    log(`Starting ${name}`);

    for (const index in queries) {
      log(`Running ${name} query ${parseInt(index) + 1} of ${queries.length}`);
      await pool.query(queries[index]);
    }

    log(`Finished ${name}`);
  } catch (err) {
    log(`Error: ${err.message}`);
    throw err;
  }
};

module.exports = {
  loadQueries
};
