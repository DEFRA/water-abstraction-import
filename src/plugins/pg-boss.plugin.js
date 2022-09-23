'use strict'

const config = require('../../config')
const db = require('../../src/lib/connectors/db')

const plugin = {
  name: 'pgBoss',
  register: async (server, options) => {
    const PgBoss = require('pg-boss')
    const boss = new PgBoss(options)
    server.decorate('server', 'messageQueue', boss)
    server.decorate('request', 'messageQueue', boss)
    return boss.start()
  }
}

const options = {
  ...config.pgBoss,
  db: {
    executeSql: (...args) => db.pool.query(...args)
  }
}

module.exports = {
  plugin,
  options
}
