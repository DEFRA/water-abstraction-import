'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (transformedPartyData) {
  const params = [transformedPartyData.name, transformedPartyData.type, transformedPartyData.externalId]
  const query = `
  WITH subquery AS (
    SELECT
      $1::varchar AS "name",
      $2::varchar AS "type",
      $3::varchar AS external_id,
      NOW() AS date_created,
      NOW() AS date_updated,
      (md5(CONCAT($1::varchar, $2::varchar)::varchar)) AS current_hash,
      (SELECT r.region_id FROM water.regions r WHERE r.nald_region_id::text = LEFT($3::varchar, 1)) AS region_id
  )
  INSERT INTO crm_v2.companies (
    name,
    type,
    external_id,
    date_created,
    date_updated,
    current_hash,
    region_id
  )
  SELECT
    sq."name",
    sq."type",
    sq.external_id,
    sq.date_created,
    sq.date_updated,
    sq.current_hash,
    sq.region_id
  FROM
    subquery sq
  ON CONFLICT (external_id) DO UPDATE
  SET
    "name" = EXCLUDED.name,
    date_updated = EXCLUDED.date_updated,
    "type" = EXCLUDED."type",
    last_hash = EXCLUDED.current_hash,
    current_hash = md5(
      CONCAT(
        EXCLUDED.name::varchar,
        EXCLUDED.type::varchar
      )::varchar
    ),
    region_id = EXCLUDED.region_id;
  `

  await db.query(query, params)
}

module.exports = {
  go
}
