'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (transformedPartyData) {
  if (!transformedPartyData.licenceHolderContact) {
    return null
  }

  const { externalId, licenceHolderContact } = transformedPartyData
  const params = [
    externalId,
    licenceHolderContact.contact.externalId,
    licenceHolderContact.role,
    licenceHolderContact.startDate,
    licenceHolderContact.endDate
  ]
  const query = `
    INSERT INTO crm_v2.company_contacts (
      company_id,
      contact_id,
      role_id,
      start_date,
      end_date,
      is_default,
      date_created,
      date_updated
    )
    SELECT
      c.company_id,
      o.contact_id,
      r.role_id,
      $4,
      $5,
      TRUE,
      NOW(),
      NOW()
    FROM
      crm_v2.companies c
    JOIN crm_v2.contacts o
      ON o.external_id = $2
    JOIN crm_v2.roles r
      ON r.name = $3
    WHERE
      c.external_id = $1
    ON CONFLICT (
      company_id,
      contact_id,
      role_id,
      start_date
    ) DO UPDATE
    SET
      contact_id = EXCLUDED.contact_id,
      is_default = EXCLUDED.is_default,
      end_date = EXCLUDED.end_date,
      date_updated = EXCLUDED.date_updated;
  `

  await db.query(query, params)
}

module.exports = {
  go
}
