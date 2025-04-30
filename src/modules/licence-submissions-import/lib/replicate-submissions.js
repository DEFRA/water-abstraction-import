'use strict'

/**
 * Replicate the return submission data from NALD in WRLS
 * @module
 */

const { returns: returnsHelpers } = require('@envage/water-abstraction-helpers')

const db = require('../../../lib/connectors/db.js')
const { generateUUID } = require('../../../lib/general.js')
const { daysFromPeriod, weeksFromPeriod, monthsFromPeriod } = require('../../licence-returns-import/lib/return-helpers.js')

const OLD_LINES_CUT_OFF_DATE = new Date('2012-12-31')

/**
 * Replicate the return submission data from NALD in WRLS
 *
 * @param {object[]} returnLogs - completed return logs in WRLS missing submission data
 */
async function go (returnLogs) {
  const versions = []
  const lines = []

  for (const returnLog of returnLogs) {
    // NOTE: Even though `returnLogs` are records from the water schema, and are date fields in the DB, we get them
    // back as dates. As we need to refer to them in lots of places, we simplify things by casting them to actual dates
    // here rather than repeatedly where we use them
    returnLog.start_date = new Date(returnLog.start_date)
    returnLog.end_date = new Date(returnLog.end_date)

    const naldLines = await _naldLines(returnLog)
    const nilReturn = _nilReturn(naldLines)
    const version = _version(returnLog, nilReturn)

    if (!nilReturn) {
      const blankLines = _blankLines(returnLog)

      _populateBlankLines(returnLog, version, blankLines, naldLines)

      lines.push(...blankLines)
    }

    versions.push(version)
  }

  return { lines, versions }
}

function _blankLines (returnLog) {
  const { end_date: endDate, returns_frequency: frequency, start_date: startDate } = returnLog

  if (frequency === 'day') {
    return daysFromPeriod(startDate, endDate)
  }

  if (frequency === 'week') {
    return weeksFromPeriod(startDate, endDate)
  }

  return monthsFromPeriod(startDate, endDate)
}

async function _naldLines (returnLog) {
  const currentLines = await _naldLinesCurrent(returnLog)
  const oldLines = await _naldLinesOld(returnLog)

  return [...currentLines, ...oldLines]
}

async function _naldLinesCurrent (returnLog) {
  const params = [
    returnLog.return_requirement,
    returnLog.nald_region_id,
    returnLog.start_date,
    returnLog.end_date
  ]

  const query = `
      SELECT
        nrl."ARFL_ARTY_ID",
        nrl."ARFL_DATE_FROM",
        nrl."RET_DATE",
        nrl."RET_QTY",
        nrl."RET_QTY_USABILITY",
        nrl."UNIT_RET_FLAG",
        to_date("RET_DATE", 'YYYYMMDDHH24MISS') AS end_date,
        (false) AS matched
      FROM "import"."NALD_RET_LINES" nrl
      WHERE
        nrl."RET_QTY" IS NOT NULL
        AND nrl."RET_QTY" <> 'null'
        AND nrl."RET_QTY" <> ''
        AND nrl."RET_QTY" <> '0'
        AND nrl."ARFL_ARTY_ID"=$1
        AND nrl."FGAC_REGION_CODE"=$2
        AND to_date(nrl."RET_DATE", 'YYYYMMDDHH24MISS') >= to_date($3, 'YYYY-MM-DD')
        AND to_date(nrl."RET_DATE", 'YYYYMMDDHH24MISS') <= to_date($4, 'YYYY-MM-DD')
      ORDER BY "RET_DATE" ASC;
    `

  return db.query(query, params)
}

async function _naldLinesOld (returnLog) {
  // If the return log's start date is 2013-01-01 or greater then it's return lines will be in the NALD nightly extract.
  // It is only return lines with a `ARFL_DATE_FROM` of 2012-12-31 or less that exist in the one-off extract
  if (returnLog.start_date > OLD_LINES_CUT_OFF_DATE) {
    return []
  }

  const params = [
    returnLog.return_requirement,
    returnLog.nald_region_id,
    returnLog.start_date,
    returnLog.end_date
  ]

  // Though very similar to the query in `_naldLinesCurrent()`, the date format is different. We could 'fix' the data in the
  // one-off extract so it matches and we could just reuse the query. But as we intend to delete both the extract and
  // this code in a few months we've opted to just live with some copy & paste!
  const query = `
    SELECT * FROM (
      SELECT
        nrl."ARFL_ARTY_ID",
        nrl."ARFL_DATE_FROM",
        nrl."RET_DATE",
        nrl."RET_QTY",
        nrl."RET_QTY_USABILITY",
        nrl."UNIT_RET_FLAG",
        to_date("RET_DATE", 'DD/MM/YYYY') AS end_date,
        (false) AS matched
      FROM public."NALD_RET_LINES" nrl
      WHERE
        nrl."RET_QTY" IS NOT NULL
        AND nrl."RET_QTY" <> 'null'
        AND nrl."RET_QTY" <> ''
        AND nrl."RET_QTY" <> '0'
        AND nrl."ARFL_ARTY_ID" = $1
        AND nrl."FGAC_REGION_CODE" = $2
        AND to_date(nrl."RET_DATE", 'DD/MM/YYYY') >= to_date($3, 'YYYY-MM-DD')
        AND to_date(nrl."RET_DATE", 'DD/MM/YYYY') <= to_date($4, 'YYYY-MM-DD')
    ) results
    ORDER BY results.end_date ASC;
  `

  return db.query(query, params)
}

/**
 * This function is here purely so we have somewhere to put this useful note about one of the reasons why we may have a
 * nil return.
 *
 * Old NALD form logs can have awkward dates. For example, 28/39/22/0056 has a NALD_RET_FORMAT (ID = 1, FGAC_REGION_CODE
 * = 7), which requires recording monthly, reporting yearly. This results in a NALD_RET_FORM_LOG dated
 *
 * - 01/01/1999 - 31/12/1999
 *
 * Problem is, when that format is put through the WRLS engine, which incorporates cycles, you end up with multiple
 * return logs
 *
 * - 1998-04-01 - 1999-03-31
 * - 1999-04-01 - 2000-03-31
 *
 * So, the transformation engine will have created and marked as `complete` both return logs, but the NALD lines with
 * data only match to the second return log. That results in a 'completed' return log with no submission data. So, we
 * create a Nil return submission. This way it won't appear 'wrong' in the UI (completed but no submission data) and
 * will be skipped on the next import-job run, helping to keep the run time manageable.
 *
 * @private
 */
function _nilReturn (naldLines) {
  return naldLines.length === 0
}

function _populateBlankLines (returnLog, version, blankLines, naldLines) {
  const { RET_QTY_USABILITY: readingType, UNIT_RET_FLAG: userUnit } = naldLines[0]

  for (const line of blankLines) {
    // NOTE: We _were_ importing return logs for quarterly and yearly but _only_ the return logs; the submission data
    // was part of the old return lines so not being imported.
    //
    // > Fortnightly was not a valid value in WRLS so these would just blow up!
    //
    // We need to bring them all in, which means converting them (fortnight to weekly, quarter and year to month). But
    // its not a straight conversion. For example, in NALD the quarter will be 1 line, but when converted to WRLS that
    // will become 3 (1 per month). Our current logic matches WRLS lines to NALD based on the period, so we'd get the
    // same qty assigned 3 times.
    //
    // This is why we came up with marking lines as matched once they have been used. When unmatchedNaldLines is passed
    // to _totalLineQuantity() it will set the `matched` flag on any it uses so we don't use them again within the same
    // return submission.
    const unmatchedNaldLines = naldLines.filter((naldLine) => {
      return !naldLine.matched
    })

    line.line_id = generateUUID()
    line.version_id = version.version_id
    line.time_period = returnLog.returns_frequency
    line.metadata = {}
    line.user_unit = returnsHelpers.mappers.mapUnit(userUnit)
    line.reading_type = returnsHelpers.mappers.mapUsability(readingType)
    line.quantity = _totalLineQuantity(line, unmatchedNaldLines)
  }
}

function _totalLineQuantity (blankLine, naldLines) {
  let match = false
  let totalQuantity = 0

  for (const naldLine of naldLines) {
    if (naldLine.matched) {
      continue
    }

    // Even though we cast RET_DATE to a Date as `end_date` in the query, the DB connection the
    // water-abstraction-helpers makes always returns it as a string.
    const naldLineEndDate = new Date(naldLine.end_date)

    // We have gone past the last line that could possibly match so stop looking
    if (naldLineEndDate > blankLine.end_date) {
      break
    }

    // The nald line ends before the blank line starts so continue to the next line
    if (naldLineEndDate < blankLine.start_date) {
      continue
    }

    // We have found a match!
    match = true
    totalQuantity += parseFloat(naldLine.RET_QTY)

    // Mark line as having been matched. This is needed for NALD frequencies that WRLS does not support, for example,
    // quarterly. The NALD line can match multiple times but we only want to use its quantity once.
    naldLine.matched = true
  }

  if (match) {
    return totalQuantity
  }

  return null
}

function _version (returnLog, nilReturn) {
  return {
    current: returnLog.current,
    metadata: {},
    nil_return: nilReturn,
    return_id: returnLog.return_id,
    user_id: 'imported@from.nald',
    user_type: 'system',
    version_id: generateUUID(),
    version_number: returnLog.version_number
  }
}

module.exports = {
  go
}
