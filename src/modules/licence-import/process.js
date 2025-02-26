'use strict'

const db = require('../../lib/connectors/db.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')
const Transformer = require('./lib/transformer.js')

async function go (permitJson, index = 0, log = false) {
  try {
    const startTime = currentTimeInNanoseconds()

    if (!permitJson.data.versions.length === 0) {
      return null
    }

    const { licence: waterLicence } = Transformer.go(permitJson)

    await _persistLicence(waterLicence)

    if (log) {
      calculateAndLogTimeTaken(startTime, `licence-import: complete (${index})`)
    }
  } catch (error) {
    global.GlobalNotifier.omfg('licence-import: errored', error, { licenceRef: permitJson?.LIC_NO, index })
  }
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
