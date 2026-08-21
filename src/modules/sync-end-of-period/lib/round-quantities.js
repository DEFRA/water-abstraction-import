'use strict'

const db = require('../../../lib/connectors/db.js')

async function go () {
  await db.query(`UPDATE "returns".lines l
SET
  quantity = ROUND(quantity, 6)
WHERE
  l.quantity IS NOT NULL
  AND l.quantity != ROUND(l.quantity, 6);`)
}

module.exports = {
  go
}
