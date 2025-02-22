'use strict'

const db = require('../../lib/connectors/db.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')
const PermitTransformer = require('./lib/permit-transformer.js')
const PersistPermit = require('./lib/persist-permit.js')

async function go(licence, index = 0, log = false) {
  try {
    const startTime = currentTimeInNanoseconds()

    const permitData = await _permitData(licence)

    if (permitData.data.versions.length === 0) {
      return null
    }

    await PersistPermit.go(permitData)

    if (log) {
      calculateAndLogTimeTaken(startTime, `licence-permit-import: complete (${index})`)
    }
  } catch (error) {
    global.GlobalNotifier.omfg('licence-permit-import: errored', error, { licence, index })
  }
}

/**
 * When triggered from a POST request (for testing/debugging), licence will be a reference, so we need to first fetch
 * the matching NALD licence record, then call PermitTransformer to get the full permit data object that represents what
 * we persist.
 *
 * When triggered from the job, `LicenceImportJob` passes in the result of a call to PermitTransformer, because we use
 * the same object in all 4 licence import processes to reduce the number of queries being made against the DB.
 *
 * @private
 */
async function _permitData (licence) {
  if (typeof licence !== 'string') {
    return licence
  }

  const results = await db.query('SELECT l.* FROM "import"."NALD_ABS_LICENCES" l WHERE l."LIC_NO" = $1;', [licence])

  return PermitTransformer.go(results[0])
}

module.exports = {
  go
}
