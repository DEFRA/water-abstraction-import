'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')

const processHelper = require('@envage/water-abstraction-helpers').process

const db = require('../../../lib/connectors/db.js')
const QueueJob = require('./queue.js')
const s3 = require('../../../lib/services/s3.js')

const JOB_NAME = 'return-logs.download'
const OLD_LINES_CSV_FILE = 'old_nald_return_lines.csv'
const OLD_LINES_SQL_FILE = 'old_nald_return_lines.sql'
const OLD_LINES_ZIP_FILE = 'old_nald_return_lines.zip'

const config = require('../../../../config.js')

function createMessage (cleanReturnLogs, licenceRef) {
  return {
    name: JOB_NAME,
    data: {
      licenceRef,
      cleanReturnLogs
    },
    options: {
      singletonKey: JOB_NAME
    }
  }
}

async function handler () {
  try {
    global.GlobalNotifier.omg(`${JOB_NAME}: started`)

    // Determine if the one-off pre-2013 NALD return lines data extract table exists and is populated
    let oldLinesExist = await _oldLinesExist()

    // We should only ever need to create and load the table once per environment
    if (!oldLinesExist) {
      const extractExists = await _oldLinesFileExists()

      if (extractExists) {
        const downloadLocalPath = await _downloadOldLinesFile()
        const extractLocalPath = await _extractOldLinesFile(downloadLocalPath)

        await _createOldLinesTable()
        const sqlLocalPath = await _loadOldLinesTable(extractLocalPath)

        _cleanUpFiles(downloadLocalPath, extractLocalPath, sqlLocalPath)
      }

      oldLinesExist = true
    }

    return oldLinesExist
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (messageQueue, job) {
  if (!job.failed) {
    const oldLinesExist = job.data.response.value
    const { cleanReturnLogs, licenceRef } = job.data.request.data

    await messageQueue.publish(QueueJob.createMessage(cleanReturnLogs, oldLinesExist, licenceRef))
  }

  global.GlobalNotifier.omg(`${JOB_NAME}: finished`)
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
  JOB_NAME,
  createMessage,
  handler,
  onComplete
}
