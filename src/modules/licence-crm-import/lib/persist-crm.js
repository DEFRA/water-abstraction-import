'use strict'

const db = require('../../../lib/connectors/db.js')
const { generateUUID } = require('../../../lib/general.js')

async function go (crmData) {
  const params = [
    crmData.system_external_id,
    generateUUID(),
    crmData.system_external_id,
    crmData.metadata
  ]
  const query = `
    INSERT INTO crm.document_header (
      regime_entity_id,
      system_id,
      system_internal_id,
      document_id,
      system_external_id,
      metadata,
      date_updated
    )
    VALUES (
      '0434dc31-a34e-7158-5775-4694af7a60cf',
      'permit-repo',
      (SELECT l.licence_id FROM permit.licence l WHERE l.licence_ref = $1 LIMIT 1),
      $2,
      $3,
      $4,
      now()
    )
    ON CONFLICT (
      system_external_id
    )
    DO UPDATE SET
      metadata = EXCLUDED.metadata,
      date_updated = EXCLUDED.date_updated;
  `

  await db.query(query, params)
}

module.exports = {
  go
}
