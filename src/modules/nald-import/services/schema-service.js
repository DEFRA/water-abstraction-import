'use strict'

const db = require('../lib/db')
const constants = require('../lib/constants')

const dropSchema = name => db.dbQuery(`drop schema if exists ${name} cascade`)
const createSchema = name => db.dbQuery(`create schema if not exists ${name}`)
const renameSchema = (from, to) => db.dbQuery(`alter schema ${from} rename to ${to};`)

/**
 * Drops and creates the import schema ready to import the CSVs as tables
 * @schemaName {String} The name of the schema to recreate.
 * @return {Promise}
 */
async function dropAndCreateSchema (schemaName = constants.SCHEMA_IMPORT) {
  await dropSchema(schemaName)
  await createSchema(schemaName)
}

const swapTemporarySchema = async () => {
  await dropSchema(constants.SCHEMA_IMPORT)
  await renameSchema(constants.SCHEMA_TEMP, constants.SCHEMA_IMPORT)
}

module.exports = {
  dropAndCreateSchema,
  swapTemporarySchema,
  renameSchema
}
