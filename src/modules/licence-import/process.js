'use strict'

const db = require('../../lib/connectors/db.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')
const PermitTransformer = require('../licence-permit-import/lib/permit-transformer.js')
const Transformer = require('./lib/transformer.js')

async function go(licence, index = 0, log = false) {
  try {
    const startTime = currentTimeInNanoseconds()

    const permitData = await _permitData(licence)

    if (!permitData || permitData.data.versions.length === 0) {
      return null
    }

    const { licence: waterLicence } = Transformer.go(permitData)

    await _persistLicence(waterLicence)

    if (log) {
      calculateAndLogTimeTaken(startTime, `licence-import: complete (${index})`)
    }
  } catch (error) {
    global.GlobalNotifier.omfg('licence-import: errored', error, { licence, index })
  }
}

/**
 * When triggered from a POST request (for testing/debugging), licence will be a reference, so we need to first fetch
 * the matching NALD licence record, then call PermitTransformer to get the full permit data object that represents what
 * gets persisted before the CRM data.
 *
 * When triggered from the job, `LicenceImportJob` passes in the result of a call to PermitTransformer, because we use
 * the same object in all licence import processes to reduce the number of queries being made against the DB.
 *
 * Either way, this process ends up with a populated Permit object from which the CRM data can be extracted,
 * transformed, and persisted.
 *
 * @private
 */
async function _permitData (licence) {
  if (typeof licence !== 'string') {
    return licence
  }

  let results = await db.query('SELECT l.* FROM "import"."NALD_ABS_LICENCES" l WHERE l."LIC_NO" = $1;', [licence])

  return PermitTransformer.go(results[0])
}

async function _persistLicence (licence) {
  const params = [
    licence.regionCode,
    licence.licenceNumber,
    licence.isWaterUndertaker,
    licence.regions,
    licence.startDate,
    licence.expiredDate,
    licence.lapsedDate,
    licence.revokedDate
  ]

  const query = `
    INSERT INTO water.licences (
      region_id,
      licence_ref,
      is_water_undertaker,
      regions,
      start_date,
      expired_date,
      lapsed_date,
      revoked_date,
      date_created,
      date_updated
    )
    VALUES (
      (SELECT region_id FROM water.regions WHERE nald_region_id = $1), $2, $3, $4, $5, $6, $7, $8, now(), now()
    )
    ON CONFLICT (licence_ref)
    DO UPDATE SET
      is_water_undertaker = excluded.is_water_undertaker,
      regions = excluded.regions,
      start_date = excluded.start_date,
      expired_date = excluded.expired_date,
      lapsed_date = excluded.lapsed_date,
      revoked_date = excluded.revoked_date,
      date_updated = excluded.date_updated;
  `

  await db.query(query, params)
}

module.exports = {
  go
}
