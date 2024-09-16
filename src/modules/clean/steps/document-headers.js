'use strict'

const db = require('../../../lib/connectors/db.js')
const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../../lib/general.js')

async function go () {
  try {
    global.GlobalNotifier.omg('clean.document-headers started')

    const startTime = currentTimeInNanoseconds()

    await _clean()

    calculateAndLogTimeTaken(startTime, 'clean.document-headers complete')
  } catch (error) {
    global.GlobalNotifier.omfg('clean.document-headers errored', error)
    throw error
  }
}

async function _clean () {
  return db.query(`
    UPDATE
      crm.document_header
    SET
      date_deleted = now()
    WHERE
      system_external_id NOT IN (
        SELECT
          l."LIC_NO"
        FROM
          "import"."NALD_ABS_LICENCES" l
      )
      AND date_deleted IS NULL;
  `)
}

module.exports = {
  go
}
