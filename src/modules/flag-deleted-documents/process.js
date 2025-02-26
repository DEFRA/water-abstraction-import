'use strict'

const db = require('../../lib/connectors/db.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

async function go (log = false) {
  try {
    const startTime = currentTimeInNanoseconds()

    await _crmDocuments()
    await _crmV2Documents()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'flag-deleted-documents: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('flag-deleted-documents: errored', error)
  }
}

async function _crmDocuments () {
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

async function _crmV2Documents () {
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

module.exports = {
  go
}
