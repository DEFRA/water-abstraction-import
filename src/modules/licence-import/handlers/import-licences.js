const server = require('../../../../index.js');
const jobs = require('../jobs');
const extract = require('../extract');
const { logger } = require('../../../logger');

module.exports = async job => {
  try {
    logger.info('Importing licences');
    const rows = await extract.getAllLicenceNumbers();

    for (const row of rows) {
      await server.messageQueue.publish(jobs.importLicence(row.LIC_NO));
    }
  } catch (err) {
    logger.error('Import licences error', err);
    throw err;
  }
};
