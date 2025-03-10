'use strict'

const PgBoss = require('pg-boss')
const helpers = require('@envage/water-abstraction-helpers')

const config = require('../../config')

const PgBossPlugin = {
  name: 'pgBoss',
  register: async (server, _options) => {
    const poolConfig = { connectionString: config.pg.connectionString, max: 5 }
    const pool = helpers.db.createPool(poolConfig, server.logger)

    const pgBossOptions = {
      application_name: config.pgBoss.application_name,
      schema: config.pgBoss.schema,
      db: {
        executeSql: (...args) => pool.query(...args)
      }
    }

    const boss = new PgBoss(pgBossOptions)

    server.decorate('server', 'messageQueue', boss)
    server.decorate('request', 'messageQueue', boss)

    await boss.start()
  }
}

module.exports = PgBossPlugin
