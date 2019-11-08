const server = require('../../../../index.js');
const jobs = require('../jobs');
const extract = require('../extract');
const { logger } = require('../../../logger');
const { groupBy } = require('lodash');

module.exports = async job => {
  try {
    logger.info('Importing licences');
    const rows = await extract.getAllLicenceNumbers();

    const groups = groupBy(rows, row => row.LIC_NO);

    for (let licenceNumber in groups) {
      for (let row of groups[licenceNumber]) {
        await server.messageQueue.publish(...jobs.importCompany(row.FGAC_REGION_CODE, row.ACON_APAR_ID));
      }
      await server.messageQueue.publish(...jobs.importLicence(licenceNumber));
    }
  } catch (err) {
    console.error(`Import licences error`, err);
    throw err;
  }
};
