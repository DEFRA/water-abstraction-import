'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (transformedPartyData) {
  for (const roleAddress of transformedPartyData.roleAddresses) {
    await _persistCompanyAddress(roleAddress, transformedPartyData.externalId)
  }
}

async function _persistCompanyAddress (roleAddress, companyExternalId) {
  const params = [companyExternalId, roleAddress.address.externalId, roleAddress.role, roleAddress.startDate, roleAddress.endDate]
  const query = `
    INSERT INTO crm_v2.company_addresses (
      company_id,
      address_id,
      role_id,
      start_date,
      end_date,
      is_default,
      date_created,
      date_updated
    )
    SELECT
      c.company_id,
      a.address_id,
      r.role_id,
      $4,
      $5,
      TRUE,
      NOW(),
      NOW()
    FROM
      crm_v2.companies c
    JOIN crm_v2.addresses a
      ON a.external_id = $2
    JOIN crm_v2.roles r
      ON r.name = $3
    WHERE
      c.external_id = $1
    ON CONFLICT (
      company_id,
      address_id,
      role_id
    ) DO UPDATE
    SET
      address_id = EXCLUDED.address_id,
      is_default = EXCLUDED.is_default,
      end_date = EXCLUDED.end_date,
      date_updated = EXCLUDED.date_updated;
  `

  await db.query(query, params)
}

module.exports = {
  go
}
