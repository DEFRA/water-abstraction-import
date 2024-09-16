'use strict'

const db = require('../../../lib/connectors/db.js')
const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../../lib/general.js')

async function go () {
  try {
    global.GlobalNotifier.omg('clean.documents started')

    const startTime = currentTimeInNanoseconds()

    await _clean()

    calculateAndLogTimeTaken(startTime, 'clean.documents complete')
  } catch (error) {
    global.GlobalNotifier.omfg('clean.documents errored', error)
    throw error
  }
}

async function _clean () {
  return db.query(`
    UPDATE
      crm_v2.documents
    SET
      date_deleted = now()
    WHERE
      document_ref NOT IN (
        SELECT
          l."LIC_NO"
        FROM import."NALD_ABS_LICENCES" l
      )
      AND date_deleted IS NULL;
  `)
}

module.exports = {
  go
}
