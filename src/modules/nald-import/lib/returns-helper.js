const { logger } = require('../../../logger')
const moment = require('moment')
const { v4: uuid } = require('uuid')
const db = require('./db')
const returnsApi = require('../../../lib/connectors/returns')
const { versions, lines } = returnsApi

const dbdateformat = 'YYYY-MM-DD'

/* UTILS */
const plainEnglishFrequency = (val = 'M') => ({
  D: 'day',
  W: 'week',
  M: 'month',
  Y: 'year'
}[val])

const padDateComponent = (val = '1') => val.length === 1 ? `0${val}` : val

const createLine = (versionId, startDate, endDate, frequency, line, qtyKey) => parseFloat(line[qtyKey]) > 0 &&
  lines.create({
    line_id: uuid(),
    version_id: versionId,
    substance: 'water',
    quantity: parseFloat(line[qtyKey]),
    unit: 'm³',
    user_unit: 'm³',
    start_date: startDate,
    end_date: endDate,
    time_period: plainEnglishFrequency(frequency),
    metadata: JSON.stringify(line),
    reading_type: 'measured'
  })

/* MAIN FUNC */
const replicateReturnsDataFromNaldForNonProductionEnvironments = async thisReturn => {
  const { metadata } = thisReturn
  // create returns.versions
  const version = await versions.create({
    metadata,
    version_id: uuid(),
    return_id: thisReturn.return_id,
    user_id: 'imported@from.nald',
    user_type: 'system',
    version_number: JSON.parse(metadata).version,
    nil_return: false,
    current: JSON.parse(metadata).isCurrent
  })

  const naldReturnFormatQuery = await db.dbQuery('SELECT * FROM import."NALD_RET_FORMATS" WHERE "ID" = $1', [thisReturn.return_requirement])
  const naldReturnFormat = naldReturnFormatQuery[0]

  const naldLinesFromNaldReturnFormLogs = await db.dbQuery(`
        SELECT * FROM import."NALD_RET_FORM_LOGS"
        WHERE "ARTY_ID" = $1
        AND "FGAC_REGION_CODE" = $2
        AND "DATE_FROM" = $3
        ORDER BY to_date("DATE_FROM", 'DD/MM/YYYY')`,
  [
    thisReturn.return_requirement,
    naldReturnFormat.FGAC_REGION_CODE,
      `${padDateComponent(naldReturnFormat.ABS_PERIOD_ST_DAY)}/${padDateComponent(naldReturnFormat.ABS_PERIOD_ST_MONTH)}/${moment(thisReturn.start_date).format('YYYY')}`
  ])

  const returnLinesFromNaldReturnLines = await db.dbQuery(`
            SELECT * FROM import."NALD_RET_LINES" WHERE
            "ARFL_ARTY_ID" = $1
            AND "FGAC_REGION_CODE" = $2
            AND to_date("RET_DATE", 'YYYYMMDDHH24MISS')>=to_date($3, $5)
            AND to_date("RET_DATE", 'YYYYMMDDHH24MISS')<=to_date($4, $5)
            ORDER BY "RET_DATE";
        `,
  [
    thisReturn.return_requirement,
    naldReturnFormat.FGAC_REGION_CODE,
      `${moment(thisReturn.start_date).format('YYYY')}-${padDateComponent(naldReturnFormat.ABS_PERIOD_ST_MONTH)}-${padDateComponent(naldReturnFormat.ABS_PERIOD_ST_DAY)}`,
      `${moment(thisReturn.start_date).add(naldReturnFormat.ABS_PERIOD_END_MONTH < naldReturnFormat.ABS_PERIOD_ST_MONTH ? 1 : 0, 'year').format('YYYY')}-${padDateComponent(naldReturnFormat.ABS_PERIOD_END_MONTH)}-${padDateComponent(naldReturnFormat.ABS_PERIOD_END_DAY)}`,
      dbdateformat
  ])

  // Two db queries have been run
  // Now we check if they have pulled any data from the db
  // If they have, set qtyKey to be the name of the column we will be summing up
  // Set iterable to the data set we will be summing
  let qtyKey
  let iterable

  if (returnLinesFromNaldReturnLines.length > 0) {
    qtyKey = 'RET_QTY'
    iterable = returnLinesFromNaldReturnLines
  } else if (naldLinesFromNaldReturnFormLogs.length > 0) {
    qtyKey = 'MONTHLY_RET_QTY'
    iterable = naldLinesFromNaldReturnFormLogs
  } else {
    iterable = []
  }

  const sumOfLines = iterable
    .map((item) => parseFloat(item[qtyKey]))
    .filter((value) => ![null, undefined, NaN].includes(value))
    .reduce((acc, num) => acc + num, 0)

  if (sumOfLines === 0) {
    logger.info(`Return ${version.data.return_id} has a sum of zero and is being marked as a nil return`)
    await versions.updateOne(version.data.version_id, { nil_return: true }, ['nil_return'])
  } else {
    logger.info(`Return ${version.data.return_id} - Creating ${iterable.length} lines`)

    iterable.forEach(line => {
      let startDate
      let endDate

      if (returnLinesFromNaldReturnLines.length > 0) {
        startDate = moment(line.RET_DATE, 'YYYYMMDD000000').format(dbdateformat)
        endDate = moment(line.RET_DATE, 'YYYYMMDD000000').format(dbdateformat)
      } else {
        startDate = moment(line.FORM_PROD_ST_DATE, 'DD/MM/YYYY').format(dbdateformat)
        endDate = moment(line.FORM_PROD_ST_DATE, 'DD/MM/YYYY').format(dbdateformat)
      }

      createLine(version.data.version_id, startDate, endDate, naldReturnFormat.ARTC_REC_FREQ_CODE, line, qtyKey)
    })
  }
}

module.exports = {
  replicateReturnsDataFromNaldForNonProductionEnvironments
}
