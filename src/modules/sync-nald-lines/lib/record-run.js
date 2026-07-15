'use strict'

const db = require('../../../lib/connectors/db.js')
const { generateUUID } = require('../../../lib/general.js')

async function go () {
  const params = [generateUUID(), 'sync-nald-lines', {}]
  await db.query(`INSERT INTO water.application_state (
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
);
  `, params)
}

module.exports = {
  go
}
