'use strict';

const logger = require('./lib/logger');
const assertImportTablesExist = require('../lib/assert-import-tables-exist');

const JOB_NAME = 'nald-import.populate-pending-import';
const importService = require('../../../lib/services/import');

const createMessage = () => ({
  name: JOB_NAME,
  options: {
    expireIn: '1 hours',
    singletonKey: JOB_NAME
  }
});

const handler = async job => {
  logger.logHandlingJob(job);

  try {
    await assertImportTablesExist.assertImportTablesExist();
    const licenceNumbers = await importService.getLicenceNumbers();

    return { licenceNumbers };
  } catch (err) {
    logger.logJobError(job, err);
    throw err;
  }
};

module.exports = {
  createMessage,
  handler,
  jobName: JOB_NAME
};
