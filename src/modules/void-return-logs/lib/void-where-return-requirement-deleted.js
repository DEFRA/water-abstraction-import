'use strict'

const db = require('../../../lib/connectors/db.js')

async function go () {
  const query = `UPDATE "returns"."returns" r
SET
  status = 'void',
  updated_at = NOW()
WHERE
  r.return_requirement_id IS NULL
  AND r.status <> 'void';
  `

  await db.query(query)
}

module.exports = {
  go
}
