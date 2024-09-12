'use strict'

const db = require('../../../lib/connectors/db.js')

async function getAddress (addressId, regionCode) {
  const query = 'SELECT a.* FROM "import"."NALD_ADDRESSES" a WHERE "ID"=$1 AND "FGAC_REGION_CODE" = $2;'

  return db.query(query, [addressId, regionCode])
}

module.exports = {
  getAddress
}
