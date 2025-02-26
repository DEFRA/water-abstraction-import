'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (licence) {
  const { AREP_CAMS_CODE: camsCode, FGAC_REGION_CODE: regionCode } = licence

  const params = [camsCode, regionCode]
  const query = 'SELECT * FROM "import"."NALD_REP_UNITS" WHERE "CODE" = $1 AND "FGAC_REGION_CODE" = $2;'

  return db.query(query, params)
}

module.exports = {
  go
}
