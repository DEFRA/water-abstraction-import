'use strict'

const helpers = require('@envage/water-abstraction-helpers')
const config = require('../../config')
const db = require('../../src/lib/connectors/db')

module.exports = {
  plugin: helpers.hapiPgBoss,
  options: {
    ...config.pgBoss,
    db: {
      executeSql: (...args) => db.pool.query(...args)
    }
  }
}
