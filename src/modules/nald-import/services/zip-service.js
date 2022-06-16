'use strict';

const { get } = require('lodash');
const path = require('path');

const processHelper = require('@envage/water-abstraction-helpers').process;
const { logger } = require('../../../logger');
const constants = require('../lib/constants');
const config = require('../../../../config');

const primaryPath = path.join(constants.LOCAL_TEMP_PATH, constants.S3_IMPORT_FILE);
const secondaryPath = path.join(constants.LOCAL_TEMP_PATH, `${constants.CSV_DIRECTORY}.zip`);

/**
 *
 * @param {String} source - file
 * @param {String} destination - file
 * @param {String} [password] - password if encrypted
 */
const extractArchive = async (source, destination, password) => {
  let command = `7z x ${source} -o${destination}`;
  if (password) {
    command += ` -p${password}`;
  }
  await processHelper.execCommand(command);
};

/**
 * Extracts files from zip downloaded from S3 bucket
 */
const extract = async () => {
  logger.info('Extracting data from NALD zip file');

  try {
    const zipPassword = get(config, 'import.nald.zipPassword');
    await extractArchive(primaryPath, constants.LOCAL_TEMP_PATH, zipPassword);
    await extractArchive(secondaryPath, constants.LOCAL_TEMP_PATH);
  } catch (err) {
    logger.error('Could not extract NALD zip', err);
    throw err;
  }
};

module.exports = {
  extract
};
