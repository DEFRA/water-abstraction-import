'use strict'

const moment = require('moment')

const { getReturnId } = require('@envage/water-abstraction-helpers').returns

const db = require('../../../lib/connectors/db.js')
const DueDate = require('./due-date')
const helpers = require('./transform-returns-helpers.js')

async function go (licenceRef) {
  const formats = await _formats(licenceRef)

  const allReturnsLogs = []

  for (const format of formats) {
    // TODO: The returns.returns table does not support a returns_frequency of fortnightly
    if (format.ARTC_REC_FREQ_CODE === 'F') {
      global.GlobalNotifier.omg(
        'return-logs.import: unsupported frequency',
        { formatId: format.ID, frequency: format.ARTC_REC_FREQ_CODE, licenceRef }
      )

      continue
    }

    const splitDate = await _splitDate(licenceRef)

    const returnLogs = await _returnLogs(licenceRef, splitDate, format)

    allReturnsLogs.push(...returnLogs)
  }

  return allReturnsLogs
}

async function _returnLogs (licenceRef, splitDate, format) {
  const cycles = helpers.getFormatCycles(format, splitDate)

  if (cycles.length === 0) {
    return []
  }

  const returnLogs = []

  // Get all the logs for the format here and filter later by cycle. This saves having to make many requests to the
  // database for each format cycle.
  const naldLogs = await _naldLogs(format.ID, format.FGAC_REGION_CODE)

  for (const cycle of cycles) {
    const naldLogsForCycle = _naldLogsForCycle(naldLogs, cycle)

    // Only create return cycles for formats with logs to allow NALD pre-pop to drive online returns
    if (naldLogsForCycle.length === 0) {
      continue
    }

    const returnLog = await _returnLog(cycle, naldLogsForCycle, licenceRef, format)
    returnLogs.push(returnLog)
  }

  return returnLogs
}

async function _returnLog (cycle, naldLogs, licenceRef, format) {
  const { startDate, endDate } = cycle

  const returnId = getReturnId(format.FGAC_REGION_CODE, licenceRef, format.ID, startDate, endDate)
  const receivedDate = helpers.mapReceivedDate(naldLogs)
  const status = helpers.getStatus(receivedDate)
  const dueDate = await DueDate.go(endDate, format)
  const metadata = await _metadata(cycle, format)

  return {
    return_id: returnId,
    regime: 'water',
    licence_type: 'abstraction',
    licence_ref: licenceRef,
    start_date: startDate,
    end_date: endDate,
    due_date: dueDate,
    returns_frequency: helpers.mapPeriod(format.ARTC_REC_FREQ_CODE),
    status,
    source: 'NALD',
    metadata,
    received_date: receivedDate,
    return_requirement: format.ID
  }
}

async function _metadata (cycle, format) {
  const { endDate, isCurrent } = cycle

  const purposes = await _purposes(format.ID, format.FGAC_REGION_CODE)
  const points = await _points(format.ID, format.FGAC_REGION_CODE)
  const isFinal = moment(endDate).isSame(helpers.getFormatEndDate(format), 'day')

  const result = {
    ...helpers.formatReturnMetadata(format, purposes, points),
    isCurrent,
    isFinal
  }

  return JSON.stringify(result)
}

async function _purposes (formatId, regionCode) {
  const params = [formatId, regionCode]
  const query = `
    SELECT
      p."APUR_APPR_CODE",
      p."APUR_APSE_CODE",
      p."APUR_APUS_CODE",
      p."PURP_ALIAS",
      p1."DESCR" AS primary_purpose,
      p2."DESCR" AS secondary_purpose,
      p3."DESCR" AS tertiary_purpose
    FROM "import"."NALD_RET_FMT_PURPOSES" p
    LEFT JOIN "import"."NALD_PURP_PRIMS" p1
      ON p."APUR_APPR_CODE" = p1."CODE"
    LEFT JOIN "import"."NALD_PURP_SECS" p2
      ON p."APUR_APSE_CODE" = p2."CODE"
    LEFT JOIN "import"."NALD_PURP_USES" p3
      ON p."APUR_APUS_CODE" = p3."CODE"
    WHERE
      p."ARTY_ID" = $1
      AND p."FGAC_REGION_CODE" = $2;
  `

  return db.query(query, params)
}

async function _points(formatId, regionCode) {
  const params = [formatId, regionCode]
  const query = `
    SELECT
      p."LOCAL_NAME",
      p."NGR1_SHEET",
      p."NGR1_EAST",
      p."NGR1_NORTH",
      p."NGR2_SHEET",
      p."NGR2_EAST",
      p."NGR2_NORTH",
      p."NGR3_SHEET",
      p."NGR3_EAST",
      p."NGR3_NORTH",
      p."NGR4_SHEET",
      p."NGR4_EAST",
      p."NGR4_NORTH"
    FROM
      "import"."NALD_RET_FMT_POINTS" fp
    LEFT JOIN
      "import"."NALD_POINTS" p
      ON fp."AAIP_ID" = p."ID" AND fp."FGAC_REGION_CODE" = p."FGAC_REGION_CODE"
    WHERE
      fp."ARTY_ID" = $1
      AND fp."FGAC_REGION_CODE" = $2;
  `

  return db.query(query, params)
}

async function _formats (licenceRef) {
  const query = `
    SELECT
      f."ID",
      f."FGAC_REGION_CODE",
      f."ARTC_REC_FREQ_CODE",
      f."ABS_PERIOD_ST_DAY",
      f."ABS_PERIOD_ST_MONTH",
      f."ABS_PERIOD_END_DAY",
      f."ABS_PERIOD_END_MONTH",
      f."FORM_PRODN_MONTH",
      f."TIMELTD_ST_DATE",
      f."TIMELTD_END_DATE",
      f."SITE_DESCR",
      f."TPT_FLAG",
      v."AABL_ID",
      v."EFF_ST_DATE",
      v."EFF_END_DATE",
      v."VERS_NO",
      l."AREP_AREA_CODE",
      l."EXPIRY_DATE" AS "LICENCE_EXPIRY_DATE",
      l."REV_DATE" AS "LICENCE_REVOKED_DATE",
      l."LAPSED_DATE" AS "LICENCE_LAPSED_DATE"
    FROM
      "import"."NALD_ABS_LICENCES" l
    LEFT JOIN "import"."NALD_RET_FORMATS" f
      ON l."ID" = f."ARVN_AABL_ID"
      AND l."FGAC_REGION_CODE" = f."FGAC_REGION_CODE"
    INNER JOIN "import"."NALD_RET_VERSIONS" v
      ON f."ARVN_VERS_NO" = v."VERS_NO"
      AND f."ARVN_AABL_ID" = v."AABL_ID"
      AND f."FGAC_REGION_CODE" = v."FGAC_REGION_CODE"
    WHERE
      l."LIC_NO" = $1
    ORDER BY
      to_date(v."EFF_ST_DATE", 'DD/MM/YYYY') ASC;
  `

  return db.query(query, [licenceRef])
}

/**
 * Gets the split date for considering returns as either current / non current Originally this date was the EFF_ST_DATE
 * of the current licence version however this has been modified to only split if a licence version has a mod log reason
 * code of SUCC - 'Succession To A Whole Licence/Licence Transfer'
 *
 * @private
 */
async function _splitDate (licenceRef) {
  const query = `
    SELECT
      v."EFF_ST_DATE"
    FROM
      "import"."NALD_ABS_LICENCES" l
    INNER JOIN "import"."NALD_ABS_LIC_VERSIONS" v
      ON l."ID" = v."AABL_ID"
      AND l."FGAC_REGION_CODE" = v."FGAC_REGION_CODE"
    INNER JOIN "import"."NALD_MOD_LOGS" m
      ON l."ID" = m."AABL_ID"
      AND l."FGAC_REGION_CODE" = m."FGAC_REGION_CODE"
      AND v."ISSUE_NO" = m."AABV_ISSUE_NO"
      AND v."INCR_NO" = m."AABV_INCR_NO"
    WHERE
      l."LIC_NO" = $1
      AND m."AMRE_CODE" = 'SUCC'
    ORDER BY
      to_date(v."EFF_ST_DATE", 'DD/MM/YYYY') DESC
    LIMIT 1;
  `

  const results = await db.query(query, [licenceRef])

  if (results.length === 0) {
    return null
  }

  return moment(results[0].EFF_ST_DATE, 'DD/MM/YYYY').format('YYYY-MM-DD')
}

async function _naldLogs (formatId, regionCode) {
  const params = [formatId, regionCode]
  const query = `
    SELECT
      l."RECD_DATE"
    FROM
      "import"."NALD_RET_FORM_LOGS" l
    WHERE
      l."ARTY_ID" = $1
      AND l."FGAC_REGION_CODE" = $2
    ORDER BY
      to_date(l."DATE_FROM", 'DD/MM/YYYY');
  `

  return db.query(query, params)
}

function _naldLogsForCycle (logs, cycle) {
  const { startDate, endDate } = cycle

  return logs.filter(log => {
    return (
      moment(log.DATE_TO, 'DD/MM/YYYY').isSameOrAfter(startDate) &&
      moment(log.DATE_FROM, 'DD/MM/YYYY').isSameOrBefore(endDate)
    )
  })
}

module.exports = {
  go
}
