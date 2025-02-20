'use strict'

const db = require('../../../lib/connectors/db.js')
const { generateUUID } = require('../../../lib/general.js')

async function go (crmData) {
  const params = [generateUUID(), crmData.system_internal_id, crmData.system_external_id, crmData.metadata]
  const query = `
    INSERT INTO crm.document_header (
      regime_entity_id,
      system_id,
      document_id,
      system_internal_id,
      system_external_id,
      metadata,
      date_updated
    )
    VALUES ('0434dc31-a34e-7158-5775-4694af7a60cf', 'permit-repo', $1, $2, $3, $4, now())
    ON CONFLICT (
      system_id,
      system_internal_id,
      regime_entity_id
    )
    DO UPDATE SET
      system_external_id = EXCLUDED.system_external_id,
      metadata = EXCLUDED.metadata,
      date_updated = EXCLUDED.date_updated;
  `

  await db.query(query, params)
}

module.exports = {
  go
}
