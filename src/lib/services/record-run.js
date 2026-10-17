'use strict'

const db = require('../connectors/db.js')
const { generateUUID } = require('../general.js')

async function go (key) {
  const params = [generateUUID(), key, {}]
  const sql = `INSERT INTO water.application_state (
  application_state_id,
  "key",
  "data",
  date_created,
  date_updated
)
VALUES (
  $1,
  $2,
  $3,
  NOW(),
  NOW()
);`

  await db.query(sql, params)
}

module.exports = {
  go
}
