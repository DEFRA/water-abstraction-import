'use strict'

/**
 * Replicate the return submission data from NALD in WRLS
 * @module
 */

const { v4: uuid } = require('uuid')
const { returns: returnsHelpers } = require('@envage/water-abstraction-helpers')

const db = require('../../../lib/connectors/db.js')
const { daysFromPeriod, weeksFromPeriod, monthsFromPeriod } = require('./return-helpers.js')

/**
 * Replicate the return submission data from NALD in WRLS
 *
 * @param {object} row - the return log generated by the import
 * @param {boolean} oldLinesExist - whether the one-off extract of pre-2013 NALD return lines exists for use when
 * replicating NALD submission data
 */
async function go (row, oldLinesExist) {
  // TODO: Support old NALD quarterly and yearly returns
  if (row.returns_frequency === 'quarter' || row.returns_frequency === 'year') {
    return
  }

  if (row.status !== 'completed') {
    return
  }

  const naldLinesParams = _naldLinesParams(row.return_id)
  const naldLines = await _naldLines(naldLinesParams)

  if (oldLinesExist) {
    await _addOldNaldLines(naldLines, row, naldLinesParams)
  }

  const naldLineData = _naldLineData(naldLines)

  const version = _version(row)
  const wrlsLines = _blankLines(row)

  _populateBlankLines(row, version, wrlsLines, naldLineData)

  await _saveVersion(version)
  await _saveLines(wrlsLines)
}

async function _addOldNaldLines (naldLines, row, naldLinesParams) {
  // If the return log's start date is 2013-01-01 or greater then it's return lines will be in the NALD nightly extract.
  // It is only return lines with a `ARFL_DATE_FROM` of 2012-12-31 or less that exist in the one-off extract
  if (row.start_date > '2012-12-31') {
    return
  }

  // Though very similar to the query in `_naldLines()`, the date format is different. We could 'fix' the data in the
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
        to_date("RET_DATE", 'DD/MM/YYYY') AS end_date
      FROM public."NALD_RET_LINES" nrl
      WHERE
        nrl."ARFL_ARTY_ID"=$1
        AND nrl."FGAC_REGION_CODE"=$2
        AND to_date(nrl."RET_DATE", 'DD/MM/YYYY') >= to_date($3, 'YYYY-MM-DD')
        AND to_date(nrl."RET_DATE", 'DD/MM/YYYY') <= to_date($4, 'YYYY-MM-DD')
    ) results
    ORDER BY results.end_date ASC;
  `

  const results = await db.query(query, naldLinesParams)

  naldLines.push(...results)
}

function _blankLines (row) {
  const frequency = row.returns_frequency
  const startDate = new Date(row.start_date)
  const endDate = new Date(row.end_date)

  if (frequency === 'day') {
    return daysFromPeriod(startDate, endDate)
  }

  if (frequency === 'week') {
    return weeksFromPeriod(startDate, endDate)
  }

  return monthsFromPeriod(startDate, endDate)
}

function _naldLineData (naldLines) {
  const { RET_QTY_USABILITY: readingType, UNIT_RET_FLAG: userUnit } = naldLines[0]

  const lines = naldLines.filter((naldLine) => {
    const { RET_QTY: qty } = naldLine

    // We need to consider a line with a qty 0 as populated, hence the more convoluted check
    return qty !== null && qty !== undefined && qty !== 'null' && qty !== ''
  })

  return {
    lines,
    readingType,
    userUnit
  }
}

async function _naldLines (naldLinesParams) {
  const query = `
    SELECT
      nrl."ARFL_ARTY_ID",
      nrl."ARFL_DATE_FROM",
      nrl."RET_DATE",
      nrl."RET_QTY",
      nrl."RET_QTY_USABILITY",
      nrl."UNIT_RET_FLAG",
      to_date("RET_DATE", 'YYYYMMDDHH24MISS') AS end_date
    FROM "import"."NALD_RET_LINES" nrl
    WHERE
      nrl."ARFL_ARTY_ID"=$1
      AND nrl."FGAC_REGION_CODE"=$2
      AND to_date(nrl."RET_DATE", 'YYYYMMDDHH24MISS') >= to_date($3, 'YYYY-MM-DD')
      AND to_date(nrl."RET_DATE", 'YYYYMMDDHH24MISS') <= to_date($4, 'YYYY-MM-DD')
    ORDER BY "RET_DATE" ASC;
  `

  return db.query(query, naldLinesParams)
}

function _naldLinesParams (returnId) {
  // The row generated by the import contains all things but the region code. Its embedded in the return id and the
  // abstraction-helpers has a function that will parse a return ID back out into its constituent parts. As the query
  // was built to work with the values extracted from it, we just go ahead and use them all!
  const { regionCode, formatId, startDate, endDate } = returnsHelpers.parseReturnId(returnId)

  return [formatId, regionCode, startDate, endDate]
}

function _populateBlankLines (row, version, blankLines, naldLineData) {
  let nilReturn = true

  for (const line of blankLines) {
    line.line_id = uuid()
    line.version_id = version.version_id
    line.time_period = row.returns_frequency
    line.metadata = {}
    line.user_unit = returnsHelpers.mappers.mapUnit(naldLineData.userUnit)
    line.reading_type = returnsHelpers.mappers.mapUsability(naldLineData.readingType)
    line.quantity = _totalLineQuantity(line, naldLineData.lines)

    if (line.quantity !== null) {
      nilReturn = false
    }
  }

  version.nil_return = nilReturn
}

async function _saveLines (lines) {
  const query = `
    INSERT INTO "returns".lines (
      end_date,
      line_id,
      metadata,
      quantity,
      reading_type,
      start_date,
      time_period,
      user_unit,
      version_id,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now())
  `

  for (const line of lines) {
    const params = [
      line.end_date,
      line.line_id,
      line.metadata,
      line.quantity,
      line.reading_type,
      line.start_date,
      line.time_period,
      line.user_unit,
      line.version_id
    ]

    await db.query(query, params)
  }
}

async function _saveVersion (version) {
  const params = [
    version.current,
    version.metadata,
    version.nil_return,
    version.return_id,
    version.user_id,
    version.user_type,
    version.version_id,
    version.version_number
  ]

  const query = `
    INSERT INTO "returns"."versions" (
      current,
      metadata,
      nil_return,
      return_id,
      user_id,
      user_type,
      version_id,
      version_number,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())
  `

  await db.query(query, params)
}

function _totalLineQuantity (blankLine, naldPopulatedLines) {
  let match = false
  let totalQuantity = 0

  for (const naldLine of naldPopulatedLines) {
    // Even though we cast RET_DATE to a Date as `end_date` in the query, the DB connection the
    // water-abstraction-helpers makes always returns them it as a string.
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
  }

  if (match) {
    return totalQuantity
  }

  return null
}

function _version (row) {
  const parsedMetadata = row.metadata instanceof Object ? row.metadata : JSON.parse(row.metadata)

  return {
    current: parsedMetadata.isCurrent,
    metadata: {},
    nil_return: false,
    return_id: row.return_id,
    user_id: 'imported@from.nald',
    user_type: 'system',
    version_id: uuid(),
    version_number: parsedMetadata.version
  }
}

module.exports = {
  go
}
