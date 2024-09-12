'use strict'

const db = require('../../../lib/connectors/db.js')

async function getParties (partyId, regionCode) {
  const query = 'SELECT p.* from "import"."NALD_PARTIES" p WHERE p."ID" = $1 AND "FGAC_REGION_CODE" = $2;'

  return db.query(query, [partyId, regionCode])
}

async function getPartyContacts (partyId, regionCode) {
  const query = `
    SELECT
      c.*, row_to_json(a.*) AS party_address
    FROM
      "import"."NALD_CONTACTS" c
    LEFT JOIN
      "import"."NALD_ADDRESSES" a
      ON a."ID" = c."AADD_ID"
    WHERE
      c."APAR_ID" = $1
      AND c."FGAC_REGION_CODE" = $2
      AND a."FGAC_REGION_CODE" = $2;
  `

  return db.query(query, [partyId, regionCode])
}

async function getParty (partyId, regionCode) {
  const query = 'SELECT p.* FROM "import"."NALD_PARTIES" p WHERE "ID" = $1 AND "FGAC_REGION_CODE" = $2;'

  return db.query(query, [partyId, regionCode])
}

module.exports = {
  getParties,
  getParty,
  getPartyContacts
}
