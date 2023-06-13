'use strict'

const { pool } = require('../../../lib/connectors/db')

/**
 * Generic means of running a sequence of queries in series, logging progress to console
 *
 * @param {String} name - name of job
 * @param {Array<String>} queries - array of SQL queries to run
 * @returns {Promise}
 */
const loadQueries = async (name, queries) => {
  try {
    global.GlobalNotifier.omg(`${name}: started`)

    for (const index in queries) {
      await pool.query(queries[index])
    }

    global.GlobalNotifier.omg(`${name}: finished`)
  } catch (error) {
    global.GlobalNotifier.omfg(`${name}: errored`, error)
    throw error
  }
}

module.exports = {
  loadQueries
}
