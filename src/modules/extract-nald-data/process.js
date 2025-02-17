'use strict'

const processHelper = require('@envage/water-abstraction-helpers').process

const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')
const LoadCsv = require('./lib/load-csv.js')
const S3 = require('./lib/s3.js')
const Schema = require('./lib/schema.js')
const Zip = require('./lib/zip.js')

// Download / unzip paths
const FINAL_PATH = './temp/NALD'

async function go(log = false) {
  try {
    const startTime = currentTimeInNanoseconds()

    // preparing folders
    await _prepare()

    // downloading from s3
    await S3.download()

    // extracting files from zip
    await Zip.extract()

    // create import_temp schema
    await Schema.dropAndCreateSchema('import_temp')

    // importing CSV files
    await LoadCsv.importFiles('import_temp')

    // swapping schema from import_temp to import
    await Schema.swapTemporarySchema()

    // cleaning up local files
    await _prepare()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'extract-nald-data: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('extract-nald-data: errored', error)
  }
}

/**
 * Move test files
 * For the purposes of unit testing, this copies dummy CSV files from a test
 * folder to the import folder ready for the import script
 * @return {Promise} resolves when command completes
 */
async function copyTestFiles () {
  await _prepare()
  await Schema.dropAndCreateSchema('import')

  // move dummy data files
  await processHelper.execCommand(`cp ./test/dummy-csv/* ${FINAL_PATH}`)

  // Import CSV
  return LoadCsv.importFiles('import')
}

/**
 * Prepares for import by removing files from temporary folder and creating directory
 *
 * @private
 */
async function _prepare () {
  await processHelper.execCommand('rm -rf ./temp/')
  await processHelper.execCommand('mkdir -p ./temp/')
  await processHelper.execCommand(`mkdir -p ${FINAL_PATH}`)
}

module.exports = {
  copyTestFiles,
  go
}
