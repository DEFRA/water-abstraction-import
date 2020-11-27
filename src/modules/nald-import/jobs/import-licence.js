'use strict';

const licenceLoader = require('../load');
const logger = require('./lib/logger');
const assertImportTablesExist = require('../lib/assert-import-tables-exist');

const JOB_NAME = 'nald-import.import-licence';

const options = {
  teamSize: 75,
  teamConcurrency: 2
};

const createMessage = licenceNumber => ({
  name: JOB_NAME,
  data: { licenceNumber },
  options: {
    singletonKey: licenceNumber
  }
});

/**
 * Imports a single licence
 * @param {Object} job
 * @param {String} job.data.licenceNumber
 */
const handler = async job => {
  logger.logHandlingJob(job);

  try {
    await assertImportTablesExist.assertImportTablesExist();

    // Import the licence
    await licenceLoader.load(job.data.licenceNumber);
  } catch (err) {
    logger.logJobError(job, err);
    throw err;
  }
};

exports.createMessage = createMessage;
exports.handler = handler;
exports.jobName = JOB_NAME;
exports.options = options;
