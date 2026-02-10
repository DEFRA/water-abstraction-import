'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (licenceHolderContact) {
  if (!licenceHolderContact) {
    return null
  }

  const { externalId, firstName, initials, lastName, salutation } = licenceHolderContact.contact
  const params = [salutation, initials, firstName, lastName, externalId]
  const query = `
    INSERT INTO crm_v2.contacts (
      salutation,
      initials,
      first_name,
      last_name,
      external_id,
      data_source,
      date_created,
      date_updated,
      current_hash
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      'nald',
      NOW(),
      NOW(),
      md5(
        CONCAT(
          $1::varchar,
          $3::varchar,
          $4::varchar
        )::varchar
      )
    ) ON CONFLICT (external_id) DO UPDATE
    SET
      salutation = EXCLUDED.salutation,
      initials = EXCLUDED.initials,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      external_id = EXCLUDED.external_id,
      date_updated = EXCLUDED.date_updated,
      last_hash = EXCLUDED.current_hash,
      current_hash = md5(
        CONCAT(
          EXCLUDED.salutation::varchar,
          EXCLUDED.first_name::varchar,
          EXCLUDED.last_name::varchar
        )::varchar
      );
  `

  await db.query(query, params)
}

module.exports = {
  go
}
