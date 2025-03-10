'use strict'

const DateHelpers = require('../../lib/date-helpers.js')
const db = require('../../lib/connectors/db.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

const REGIONS = {
  AN: 'Anglian',
  MD: 'Midlands',
  NO: 'Northumbria',
  NW: 'North West',
  SO: 'Southern',
  SW: 'South West (incl Wessex)',
  TH: 'Thames',
  WL: 'Wales',
  YO: 'Yorkshire'
}

async function go (permitJson, index = 0, log = false) {
  try {
    const startTime = currentTimeInNanoseconds()

    // If there are no versions against the licence, this is one we should be importing
    if (!permitJson.data.versions.length === 0) {
      return null
    }

    let startDate = DateHelpers.mapNaldDate(permitJson.ORIG_EFF_DATE)

    // If there is a start date against the licence, the `licence-import` can handle importing the licence data. It does
    // it en-masse, reducing 74K hits on the DB to just one! There are 30-ish NALD licence records without a start date.
    // For these we have to fall back to the versions against the licence. Hence this process exists.
    if (startDate) {
      return null
    }

    const licence = _licence(permitJson)

    await _persistLicence(licence)

    if (log) {
      calculateAndLogTimeTaken(startTime, `licence-no-start-date-import: complete (${index})`)
    }
  } catch (error) {
    global.GlobalNotifier.omfg('licence-no-start-date-import: errored', error, { licenceRef: permitJson?.LIC_NO, index })
  }
}

function _licence (permitJson) {
  const startDate = DateHelpers.mapNaldDate(permitJson.data.versions[0].EFF_ST_DATE)

  return {
    licenceNumber: permitJson.LIC_NO,
    startDate,
    isWaterUndertaker: permitJson.AREP_EIUC_CODE.endsWith('SWC'),
    regions: _regions(permitJson),
    regionCode: parseInt(permitJson.FGAC_REGION_CODE, 10),
    expiredDate: DateHelpers.mapNaldDate(permitJson.EXPIRY_DATE),
    lapsedDate: DateHelpers.mapNaldDate(permitJson.LAPSED_DATE),
    revokedDate: DateHelpers.mapNaldDate(permitJson.REV_DATE)
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

function _regions (permitData) {
  const regionPrefix = permitData.AREP_EIUC_CODE.substr(0, 2)

  return {
    historicalAreaCode: permitData.AREP_AREA_CODE,
    regionalChargeArea: REGIONS[regionPrefix],
    standardUnitChargeCode: permitData.AREP_SUC_CODE,
    localEnvironmentAgencyPlanCode: permitData.AREP_LEAP_CODE
  }
}

module.exports = {
  go
}
