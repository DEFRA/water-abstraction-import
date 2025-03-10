'use strict'

const db = require('../../../lib/connectors/db.js')

async function dropAndCreateSchema (schema) {
  await db.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE;`)
  await db.query(`CREATE SCHEMA IF NOT EXISTS ${schema};`)
}

const swapTemporarySchema = async () => {
  await db.query('DROP SCHEMA IF EXISTS import CASCADE;')
  await db.query('ALTER SCHEMA import_temp RENAME TO import;')
}

module.exports = {
  dropAndCreateSchema,
  swapTemporarySchema
}
