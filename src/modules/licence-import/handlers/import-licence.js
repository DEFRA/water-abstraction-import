const extract = require('../extract');
const transform = require('../transform');
const load = require('../load');
const { logger } = require('../../../logger');

module.exports = async job => {
  try {
    logger.info(`Import licence ${job.data.licenceNumber}`);

    // Extract data
    const data = await extract.getLicenceData(job.data.licenceNumber);

    console.log({ data });

    // Transform to new structure
    const mapped = transform.licence.transformLicence(data);

    // Load licence to DB
    await load.licence.loadLicence(mapped);
  } catch (err) {
    logger.error('Import licence error', err);
    throw err;
  }
};
