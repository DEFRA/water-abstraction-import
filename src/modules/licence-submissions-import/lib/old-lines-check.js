'use strict'

const db = require('../../../lib/connectors/db.js')

async function go () {
  const tableExists = await _oldLinesTableExists()

  if (!tableExists) {
    return false
  }

  return _oldLinesDataExists()
}

async function _oldLinesDataExists () {
  const query = 'SELECT COUNT(*) AS row_count FROM public."NALD_RET_LINES";'

  const results = await db.query(query)

  return results[0].row_count > 0
}

async function _oldLinesTableExists () {
  const query = `
    SELECT
      EXISTS(
        SELECT
          1
        FROM
          information_schema.TABLES
        WHERE
          table_type = 'BASE TABLE'
          AND table_schema = 'public'
          AND table_name = 'NALD_RET_LINES'
      )::bool AS table_exists
  `

  const results = await db.query(query)

  return results[0].table_exists
}

module.exports = {
  go
}
