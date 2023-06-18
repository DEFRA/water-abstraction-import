'use strict'

const { pool } = require('../../../lib/connectors/db')

/**
 * Generic means of running a sequence of queries in series, logging progress to console
 *
 * @param {Array<String>} queries - array of SQL queries to run
 * @returns {Promise}
 */
const loadQueries = async (queries) => {
  for (const index in queries) {
    await pool.query(queries[index])
  }
}

module.exports = {
  loadQueries
}
