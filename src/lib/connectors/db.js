'use strict'

const moment = require('moment')
const Pino = require('pino')
const pg = require('pg')

const helpers = require('@envage/water-abstraction-helpers')

const config = require('../../../config.js')

// Set date parser
pg.types.setTypeParser(pg.types.builtins.DATE, (str) => { return moment(str).format('YYYY-MM-DD') })

const pool = helpers.db.createPool(config.pg, Pino())

async function query (query, params = []) {
  const { error, rows } = await pool.query(query, params)

  if (error) {
    throw error
  }

  return rows
}

// Runs `callback` inside a single transaction, passing it a query function bound to one pooled client. Everything the
// callback runs shares that client, so a thrown error rolls the whole lot back; otherwise it commits.
async function transaction (callback) {
  const client = await pool.connect()

  const boundQuery = async (query, params = []) => {
    const { rows } = await client.query(query, params)

    return rows
  }

  try {
    await client.query('BEGIN')

    const result = await callback(boundQuery)

    await client.query('COMMIT')

    return result
  } catch (error) {
    await client.query('ROLLBACK')

    throw error
  } finally {
    client.release()
  }
}

module.exports = {
  pool,
  query,
  transaction
}
