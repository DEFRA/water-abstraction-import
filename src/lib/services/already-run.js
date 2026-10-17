'use strict'

const db = require('../connectors/db.js')

async function go (key) {
  const params = [key]
  const sql = `SELECT
  application_state_id
FROM
  water.application_state a
WHERE
  a."key" = $1;
  `

  const results = await db.query(sql, params)

  return results.length > 0
}

module.exports = {
  go
}
