'use strict'

const db = require('../../../lib/connectors/db.js')

async function go() {
  await _delete()
  await _reinstate()
}

async function _delete() {
  // Mark records in crm_v2.documents as deleted if the licence numbers no longer exist in import.NALD_ABS_LICENCES
  await db.query(`
    UPDATE crm_v2.documents
    SET date_deleted = now()
    WHERE document_ref NOT IN (
      SELECT l."LIC_NO" FROM "import"."NALD_ABS_LICENCES" l
    )
    AND date_deleted IS NULL
    AND regime = 'water'
    AND document_type = 'abstraction_licence';
  `)
}

async function _reinstate() {
  // Unflags records in crm_v2.documents if the licence numbers now exist in import.NALD_ABS_LICENCES
  await db.query(`
    UPDATE crm_v2.documents
    SET date_deleted = null
    WHERE document_ref IN (
        SELECT l."LIC_NO" FROM "import"."NALD_ABS_LICENCES" l
      )
      AND date_deleted IS NOT NULL
      AND regime = 'water'
      AND document_type = 'abstraction_licence';
  `)
}

module.exports = {
  go
}
