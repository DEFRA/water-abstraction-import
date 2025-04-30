'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')

const processHelper = require('@envage/water-abstraction-helpers').process

const db = require('../../lib/connectors/db.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')
const OldLinesCheck = require('../licence-submissions-import/lib/old-lines-check.js')
const s3 = require('../../lib/services/s3.js')

const config = require('../../../config.js')

// Download / unzip paths
const OLD_LINES_CSV_FILE = 'old_nald_return_lines.csv'
const OLD_LINES_SQL_FILE = 'old_nald_return_lines.sql'
const OLD_LINES_ZIP_FILE = 'old_nald_return_lines.zip'

async function go (skip = false, log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    if (skip) {
      global.GlobalNotifier.omg('extract-old-lines: skipped')
      messages.push('Skipped because importing returns is disabled')

      return messages
    }

    // Determine if the one-off pre-2013 NALD return lines data extract table exists and is populated
    let oldLinesExist = await OldLinesCheck.go()

    if (oldLinesExist) {
      global.GlobalNotifier.omg('extract-old-lines: skipped')
      messages.push('Skipped because they have already been extracted')

      return messages
    }

    const extractExists = await _oldLinesFileExists()

    if (extractExists) {
      const downloadLocalPath = await _downloadOldLinesFile()
      const extractLocalPath = await _extractOldLinesFile(downloadLocalPath)

      await _createOldLinesTable()
      const sqlLocalPath = await _loadOldLinesTable(extractLocalPath)

      _cleanUpFiles(downloadLocalPath, extractLocalPath, sqlLocalPath)
    }

    oldLinesExist = true

    if (log) {
      calculateAndLogTimeTaken(startTime, 'extract-old-lines: complete', { oldLinesExist })
    }
  } catch (error) {
    global.GlobalNotifier.omfg('extract-old-lines: errored', {}, error)

    messages.push(error.message)
  }

  return messages
}

function _cleanUpFiles (downloadLocalPath, extractLocalPath, sqlLocalPath) {
  // Delete the files we created. Force true means if it doesn't exist don't error (saves us checking first)
  fs.rmSync(downloadLocalPath, { force: true })
  fs.rmSync(extractLocalPath, { force: true })
  fs.rmSync(sqlLocalPath, { force: true })
}

async function _createOldLinesTable () {
  const query = `
    BEGIN TRANSACTION;

    DROP TABLE IF EXISTS public."NALD_RET_LINES";

    CREATE TABLE public."NALD_RET_LINES" (
      "ARFL_ARTY_ID" varchar NULL,
      "ARFL_DATE_FROM" varchar NULL,
      "RET_DATE" varchar NULL,
      "RET_QTY" varchar NULL,
      "RET_QTY_USABILITY" varchar NULL,
      "UNIT_RET_FLAG" varchar NULL,
      "ATPT_ACEL_ID" varchar NULL,
      "ATPT_FIN_YEAR" varchar NULL,
      "FGAC_REGION_CODE" varchar NULL,
      "SOURCE_CODE" varchar NULL,
      "BATCH_RUN_DATE" varchar NULL
    );

    DROP INDEX IF EXISTS public.idx_nald_ret_lines_id_and_region;

    CREATE INDEX idx_nald_ret_lines_id_and_region
    ON public."NALD_RET_LINES" USING btree ("ARFL_ARTY_ID", "FGAC_REGION_CODE");

    COMMIT;
  `
  await db.query(query)
}

async function _downloadOldLinesFile () {
  const temporaryFilePath = os.tmpdir()
  const localPath = path.join(temporaryFilePath, OLD_LINES_ZIP_FILE)

  // Delete any existing copy of the file. Force true means if it doesn't exist don't error (saves us checking first)
  fs.rmSync(localPath, { force: true })

  await s3.download(OLD_LINES_ZIP_FILE, localPath)

  return localPath
}

async function _extractOldLinesFile (downloadLocalPath) {
  const temporaryFilePath = os.tmpdir()
  const localPath = path.join(temporaryFilePath, OLD_LINES_CSV_FILE)

  // Delete any existing copy of the file. Force true means if it doesn't exist don't error (saves us checking first)
  fs.rmSync(localPath, { force: true })

  const command = `7z x ${downloadLocalPath} -o${temporaryFilePath} -p${config.import.nald.zipPassword}`

  await processHelper.execCommand(command)

  return localPath
}

/**
 * Loads data from the extracted CSV file into the "NALD_RET_LINES" table in the database
 *
 * PostgreSQL has a great command for loading data into a table from a CSV file quickly; `COPY`. But to use it in its
 * SQL form the file has to exist on the DB server.
 *
 * So, instead we can achieve the same result using the psql command line on the client where this app is running.
 *
 * We know this, and that it will work in production, because we copied how the NALD import job is doing it!
 *
 * The only downside is the format of the command means it isn't something we can pass in on the command line easily.
 * So, we have to write the command to a file, then have psql run that sql file. Hence, the convoluted steps we go
 * through in this function.
 *
 * We return the path to the SQL file so we can clean up after ourselves.
 *
 * @private
 */
async function _loadOldLinesTable (extractLocalPath) {
  const temporaryFilePath = os.tmpdir()
  const localPath = path.join(temporaryFilePath, OLD_LINES_SQL_FILE)

  const copyCommand = `\\copy public."NALD_RET_LINES" FROM '${extractLocalPath}' DELIMITER ',' CSV HEADER;`

  fs.writeFileSync(localPath, copyCommand)

  const psqlCommand = `psql ${config.pg.connectionString} < ${localPath}`

  await processHelper.execCommand(psqlCommand)

  return localPath
}

async function _oldLinesFileExists () {
  try {
    await s3.getHead(OLD_LINES_ZIP_FILE)

    return true
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      return false // File does not exist
    }

    throw error // Handle other errors
  }
}

module.exports = {
  go
}
