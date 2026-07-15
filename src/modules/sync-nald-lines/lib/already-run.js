'use strict'

const db = require('../../../lib/connectors/db.js')

async function go () {
  const results = await db.query(`SELECT
  application_state_id
FROM
  water.application_state a
WHERE
  a."key" = 'sync-nald-lines';
  `)

  return results.length > 0
}

module.exports = {
  go
}
