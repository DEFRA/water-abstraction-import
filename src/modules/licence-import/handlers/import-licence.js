const extract = require('../extract');
const transform = require('../transform');
const load = require('../load');
const { logger } = require('../../../logger');

module.exports = async job => {
  logger.info(`Import licence ${job.data.licenceNumber}`);

  try {
    // Extract data
    const data = await extract.getLicenceData(job.data.licenceNumber);

    // Transform to new structure
    const mapped = transform.licence.transformLicence(data);

    // Load licence to DB
    await load.licence.loadLicence(mapped);
  } catch (err) {
    console.error(err);
    throw err;
  }
};
