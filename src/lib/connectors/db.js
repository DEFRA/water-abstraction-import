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

module.exports = {
  pool,
  query
}
