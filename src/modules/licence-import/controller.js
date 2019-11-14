const jobs = require('./jobs');
const { logger } = require('../../logger');
const Boom = require('@hapi/boom');

/**
 * Run SQL queries to import charge versions / elements into
 * water service tables from NALD import tables
 * @return {Promise}
 */
const postImport = async request => {
  try {
    await request.messageQueue.publish(...jobs.importLicences());
    return {
      error: null
    };
  } catch (err) {
    logger.error('Error importing companies', err);
    return Boom.badImplementation('Error importing companies');
  };
};

exports.postImport = postImport;
