'use strict'

const db = require('../../lib/connectors/db.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')
const PersistReturns = require('./lib/persist-returns.js')
const { buildReturnsPacket } = require('./lib/transform-returns.js')
const VoidReturns = require('./lib/void-returns.js')

async function go(licence, index = 0, log = false) {
  try {
    const startTime = currentTimeInNanoseconds()

    // Determine if the one-off pre-2013 NALD return lines data extract table exists and is populated
    const oldLinesExist = await _oldLinesExist()

    await _loadReturns(licence, oldLinesExist)

    if (log) {
      calculateAndLogTimeTaken(startTime, `licence-returns-import: complete (${index})`)
    }
  } catch (error) {
    global.GlobalNotifier.omfg('licence-returns-import: errored', error, { licence, index })
  }
}

async function _loadReturns (licence, oldLinesExist) {
  const { returns } = await buildReturnsPacket(licence.LIC_NO)

  await PersistReturns.go(returns, oldLinesExist)

  // Void return logs that no longer match to those generated by this import
  await VoidReturns.go(licence.LIC_NO, returns)
}

async function _oldLinesDataExists () {
  const query = 'SELECT COUNT(*) AS row_count FROM public."NALD_RET_LINES";'

  const results = await db.query(query)

  return results[0].row_count > 0
}

async function _oldLinesExist () {
  const tableExists = await _oldLinesTableExists()

  if (!tableExists) {
    return false
  }

  return _oldLinesDataExists()
}

async function _oldLinesTableExists () {
  const query = `
    SELECT
      EXISTS(
        SELECT
          1
        FROM
          information_schema.TABLES
        WHERE
          table_type = 'BASE TABLE'
          AND table_schema = 'public'
          AND table_name = 'NALD_RET_LINES'
      )::bool AS table_exists
  `

  const results = await db.query(query)

  return results[0].table_exists
}

module.exports = {
  go
}
