'use strict'

const db = require('../../../lib/connectors/db.js')

async function go () {
  await _delete()
  await _reinstate()
}

async function _delete () {
  // Mark records in crm.document_header as deleted if the licence numbers no longer exist in import.NALD_ABS_LICENCES
  await db.query(`
    UPDATE crm.document_header
    SET date_deleted = now()
    WHERE
      system_external_id NOT IN (
        SELECT l."LIC_NO" FROM "import"."NALD_ABS_LICENCES" l
      )
      AND date_deleted IS NULL
      AND regime_entity_id = '0434dc31-a34e-7158-5775-4694af7a60cf';
  `)
}

async function _reinstate () {
  // Unflags records in crm.document_header if the licence numbers now exist in import.NALD_ABS_LICENCES
  await db.query(`
    UPDATE crm.document_header
    SET date_deleted = null
    WHERE
      system_external_id IN (
        SELECT l."LIC_NO" FROM "import"."NALD_ABS_LICENCES" l
      )
      AND date_deleted IS NOT NULL
      AND regime_entity_id = '0434dc31-a34e-7158-5775-4694af7a60cf';
  `)
}

module.exports = {
  go
}
