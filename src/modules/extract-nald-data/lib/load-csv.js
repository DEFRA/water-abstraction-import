'use strict'

const path = require('path')
const fs = require('fs')
const { promisify } = require('util')
const readFirstLine = require('firstline')

const readDir = promisify(fs.readdir)
const writeFile = promisify(fs.writeFile)

const { execCommand } = require('@envage/water-abstraction-helpers').process

const config = require('../../../../config.js')

const FINAL_PATH = './temp/NALD'

/**
 * Get a list of files to import
 * @return {Promise} resolves with array of files
 */
async function getImportFiles () {
  const files = await readDir(FINAL_PATH)
  const excludeList = ['NALD_RET_LINES_AUDIT', 'NALD_RET_FORM_LOGS_AUDIT']
  return files.filter((file) => {
    const table = file.split('.')[0]
    const extn = file.split('.')[1]
    return !(table.length === 0 || excludeList.includes(table)) && extn === 'txt'
  })
}

const indexableFieldsList = [
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

const intersection = (arr, ...args) => {
  return arr.filter(item => args.every(arr => arr.includes(item)))
}

/**
 * Gets SQL for indexes to add to the supplied table
 * @param {String} table
 * @param {Array<String>} cols
 * @return {String}
 */
const getIndexes = (table, cols) => {
  const indexableFields = intersection(indexableFieldsList, cols)
  if (table === 'NALD_RET_LINES') {
    // NALD_RET_LINES is large so more care is required when creating indexes which can take a long time to create
    return '\nCREATE INDEX idx_nald_ret_lines_id_and_region ON "import"."NALD_RET_LINES" ("ARFL_ARTY_ID", "FGAC_REGION_CODE");'
  } else {
    let str = ''
    for (const field of indexableFields) {
      const indexName = `${table}_${field}_index`
      str += `\nCREATE INDEX "${indexName}" ON "import"."${table}" ("${field}");`
    }
    return str
  }
}

/**
 * Gets import SQL for single file in import
 * @param {String} file - the CSV file to import
 * @return {String} the SQL statements to import the CSV file
 */
async function getSqlForFile (file) {
  const table = file.split('.')[0]
  const tablePath = path.join(FINAL_PATH, `${table}.txt`)
  const line = await readFirstLine(tablePath)
  const cols = line.split(',')

  let tableCreate = `\n CREATE TABLE if not exists "import"."${table}" (`

  for (let col = 0; col < cols.length; col++) {
    tableCreate += `"${cols[col]}" varchar`
    if (cols.length === (col + 1)) {
      tableCreate += ');'
    } else {
      tableCreate += ', '
    }
  }

  tableCreate += `\n \\copy "import"."${table}" FROM '${FINAL_PATH}/${file}' HEADER DELIMITER ',' CSV;`
  tableCreate += getIndexes(table, cols)

  return tableCreate
}

async function importFiles () {
  const files = await getImportFiles()
  const sqlPath = path.join(FINAL_PATH, 'sql.sql')

  for (const file of files) {
    const sql = await getSqlForFile(file)

    await writeFile(sqlPath, sql)
    await execCommand(`psql ${config.pg.connectionString} < ${sqlPath}`)
  }
}

module.exports = {
  importFiles
}
