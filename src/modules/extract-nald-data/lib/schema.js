'use strict'

const db = require('../../../lib/connectors/db.js')

async function dropAndCreateSchema () {
  await db.query('DROP SCHEMA IF EXISTS "import" CASCADE;')
  await db.query('CREATE SCHEMA IF NOT EXISTS "import";')
}

module.exports = {
  dropAndCreateSchema
}
