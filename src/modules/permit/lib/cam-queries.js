'use strict'

const db = require('../../../lib/connectors/db.js')

async function getCams (code, regionCode) {
  const query = 'SELECT * FROM "import"."NALD_REP_UNITS" WHERE "CODE" = $1 AND "FGAC_REGION_CODE" = $2;'

  return db.query(query, [code, regionCode])
}

module.exports = {
  getCams
}
