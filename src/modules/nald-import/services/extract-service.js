'use strict'

const path = require('path')
const processHelper = require('@envage/water-abstraction-helpers').process

const constants = require('../lib/constants')

const s3Service = require('./s3-service')
const zipService = require('./zip-service')
const schemaService = require('./schema-service')
const loadCsvService = require('./load-csv-service')

// Download / unzip paths
const FINAL_PATH = path.join(constants.LOCAL_TEMP_PATH, constants.CSV_DIRECTORY)

/**
 * Prepares for import by removing files from temporary folder and creating directory
 */
const prepare = async () => {
  await processHelper.execCommand(`rm -rf ${constants.LOCAL_TEMP_PATH}`)
  await processHelper.execCommand(`mkdir -p ${constants.LOCAL_TEMP_PATH}`)
  await processHelper.execCommand(`mkdir -p ${FINAL_PATH}`)
}

const steps = [
  {
    message: 'preparing folders',
    action: prepare
  },
  {
    message: 'downloading from s3',
    action: () => s3Service.download()
  },
  {
    message: 'extracting files from zip',
    action: () => zipService.extract()
  },
  {
    message: 'create import_temp schema',
    action: () => schemaService.dropAndCreateSchema(constants.SCHEMA_TEMP)
  },
  {
    message: 'importing CSV files',
    action: () => loadCsvService.importFiles(constants.SCHEMA_TEMP)
  },
  {
    message: 'swapping schema from import_temp to import',
    action: () => schemaService.swapTemporarySchema()
  },
  {
    message: 'cleaning up local files',
    action: prepare
  }
]

/**
 * The download/extract tasks have been combined into a single task
 * since they are currently running on the local file system, so must all
 * run on the same instance
 * @return {Promise}
 */
const downloadAndExtract = async () => {
  for (const step of steps) {
    await step.action()
  }
}

/**
 * Move test files
 * For the purposes of unit testing, this copies dummy CSV files from a test
 * folder to the import folder ready for the import script
 * @return {Promise} resolves when command completes
 */
const copyTestFiles = async () => {
  await prepare()
  await schemaService.dropAndCreateSchema(constants.SCHEMA_IMPORT)

  // move dummy data files
  await processHelper.execCommand(`cp ./test/dummy-csv/* ${FINAL_PATH}`)

  // Import CSV
  return loadCsvService.importFiles(constants.SCHEMA_IMPORT)
}

module.exports = {
  copyTestFiles,
  downloadAndExtract
}
