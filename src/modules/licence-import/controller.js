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
    await request.messageQueue.publish(jobs.importCompanies());
    return {
      error: null
    };
  } catch (err) {
    logger.error('Error importing companies', err);
    return Boom.badImplementation('Error importing companies');
  };
};

const postImportLicence = async request => {
  const { licenceNumber } = request.query;
  try {
    await request.messageQueue.publish(jobs.importLicence(licenceNumber));
    return { error: null };
  } catch (err) {
    const message = `Error importing licence: ${licenceNumber}`;
    logger.error(message, err);
    return Boom.badImplementation(message);
  }
};

exports.postImport = postImport;
exports.postImportLicence = postImportLicence;
