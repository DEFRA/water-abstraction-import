'use strict'

const { NALDImportTablesError } = require('./errors')
const coreQueries = require('./nald-queries/core')

const assertImportTablesExist = async () => {
  const exists = await coreQueries.importTableExists()
  if (!exists) {
    throw new NALDImportTablesError()
  }
}

module.exports = {
  assertImportTablesExist
}
