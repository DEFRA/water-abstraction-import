'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (transformedPartyData) {
  const params = [transformedPartyData.name, transformedPartyData.type, transformedPartyData.externalId]
  const query = `
    INSERT INTO crm_v2.companies (
      name,
      type,
      external_id,
      date_created,
      date_updated,
      current_hash
    )
  VALUES (
    $1,
    $2,
    $3,
    NOW(),
    NOW(),
    md5(
      CONCAT(
        $1::varchar,
        $2::varchar
      )::varchar
    )
  )
  ON CONFLICT (external_id) DO UPDATE
  SET
    name = EXCLUDED.name,
    date_updated = EXCLUDED.date_updated,
    TYPE = EXCLUDED.type,
    last_hash = EXCLUDED.current_hash,
    current_hash = md5(
      CONCAT(
        EXCLUDED.name::varchar,
        EXCLUDED.type::varchar
      )::varchar
    );
  `

  await db.query(query, params)
}

module.exports = {
  go
}
