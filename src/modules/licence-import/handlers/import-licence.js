const extract = require('../extract');
const transform = require('../transform');
const load = require('../load');
const { logger } = require('../../../logger');
const thingy = require('../../nald-import/jobs/import-licence');
const licenceLoader = require('../../nald-import/load');

module.exports = async job => {
  try {
    logger.info(`Import licence ${job.data.licenceNumber}`);
    // thingy.createMessage(job.data.licenceNumber);
    licenceLoader.load(job.data.licenceNumber);

    // Extract data
    // const data = await extract.getLicenceData(job.data.licenceNumber);

    // Transform to new structure
    // const mapped = transform.licence.transformLicence(data);

    // Load licence to DB
    // await load.licence.loadLicence(mapped);
  } catch (err) {
    logger.error('Import licence error', err);
    throw err;
  }
};
