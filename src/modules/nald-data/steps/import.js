'use strict'

const fs = require('fs')
const ProcessHelper = require('@envage/water-abstraction-helpers').process
const { promisify } = require('util')
const readDir = promisify(fs.readdir)
const ReadFirstLine = require('firstline')
const writeFile = promisify(fs.writeFile)

const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../../lib/general.js')

const config = require('../../../../config')

const INDEXABLE_FIELDS_LIST = [
  'ID',
  'LIC_NO',
  'FGAC_REGION_CODE',
  'CODE',
  'AABL_ID',
  'ARVN_AABL_ID',
  'WA_ALTY_CODE',
  'EFF_END_DATE',
  'EFF_ST_DATE',
  'STATUS',
  'EXPIRY_DATE',
  'LAPSED_DATE',
  'REV_DATE',
  'ISSUE_NO',
  'INCR_NO',
  'AADD_ID',
  'APAR_ID',
  'ACNT_CODE',
  'ACON_APAR_ID',
  'ACON_AADD_ID',
  'ALRT_CODE',
  'AABV_AABL_ID',
  'AABV_ISSUE_NO',
  'AABV_INCR_NO',
  'AMOA_CODE',
  'AAIP_ID',
  'ASRC_CODE',
  'AABP_ID',
  'ACIN_CODE',
  'ACIN_SUBCODE',
  'DISP_ORD',
  'ARTY_ID',
  'ARFL_ARTY_ID',
  'ARFL_DATE_FROM'
]

async function go () {
  try {
    global.GlobalNotifier.omg('nald-data.import started')

    const startTime = currentTimeInNanoseconds()

    const files = await _importFiles()
    const sqlPath = './temp/NALD/sql.sql'

    for (const file of files) {
      const sql = await _generateCreateTableSqlFromFile(file, 'import_temp')

      await writeFile(sqlPath, sql)
      await ProcessHelper.execCommand(`psql ${config.pg.connectionString} < ${sqlPath}`)
    }

    calculateAndLogTimeTaken(startTime, 'nald-data.import complete')
  } catch (error) {
    global.GlobalNotifier.omfg('nald-data.import errored', error)
    throw error
  }
}

/**
 * Gets import SQL for single file in import
 * @param {String} file - the CSV file to import
 * @return {String} the SQL statements to import the CSV file
 */
async function _generateCreateTableSqlFromFile (file, schemaName) {
  const table = file.split('.')[0]
  const tablePath = `./temp/NALD/${table}.txt`
  const line = await ReadFirstLine(tablePath)
  const cols = line.split(',')

  let tableCreate = `\n CREATE TABLE IF NOT EXISTS import_temp."${table}" (`

  for (let col = 0; col < cols.length; col++) {
    tableCreate += `"${cols[col]}" varchar`
    if (cols.length === (col + 1)) {
      tableCreate += ');'
    } else {
      tableCreate += ', '
    }
  }

  tableCreate += `\n \\copy import_temp."${table}" FROM './temp/NALD/${file}' HEADER DELIMITER ',' CSV;`
  tableCreate += _generateCreateIndexesSql(schemaName, table, cols)

  return tableCreate
}

/**
 * Gets SQL for indexes to add to the supplied table
 * @param {String} schemaName
 * @param {String} table
 * @param {Array<String>} cols
 * @return {String}
 */
function _generateCreateIndexesSql (table, cols) {
  const indexableFields = _intersection(INDEXABLE_FIELDS_LIST, cols)

  if (table === 'NALD_RET_LINES') {
    // NALD_RET_LINES is large so more care is required when creating indexes which can take a long time to create
    return '\nCREATE INDEX idx_nald_ret_lines_id_and_region ON import_temp."NALD_RET_LINES" ("ARFL_ARTY_ID", "FGAC_REGION_CODE");'
  } else {
    let str = ''

    for (const field of indexableFields) {
      const indexName = `${table}_${field}_index`
      str += `\nCREATE INDEX "${indexName}" ON import_temp."${table}" ("${field}");`
    }
    return str
  }
}

function _intersection (arr, ...args) {
  return arr.filter(item => args.every(arr => arr.includes(item)))
}

/**
 * Get a list of files to import
 * @return {Promise} resolves with array of files
 */
async function _importFiles () {
  const files = await readDir('./temp/NALD')
  const excludeList = ['NALD_RET_LINES_AUDIT', 'NALD_RET_FORM_LOGS_AUDIT']

  const filteredFiles = files.filter((file) => {
    const table = file.split('.')[0]
    const extension = file.split('.')[1]

    return !(table.length === 0 || excludeList.includes(table)) && extension === 'txt'
  })

  return filteredFiles
}

module.exports = {
  go
}
