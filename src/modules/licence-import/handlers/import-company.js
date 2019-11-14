const extract = require('../extract');
const transform = require('../transform');
const load = require('../load');
const { logger } = require('../../../logger');

module.exports = async job => {
  try {
    logger.info(`Import company ${job.data.regionCode} ${job.data.partyId}`);

    // Extract data
    const data = await extract.getCompanyData(job.data.regionCode, job.data.partyId);

    // Transform to new structure
    const mapped = transform.company.transformCompany(data);

    // Load to CRM database
    await load.company.loadCompany(mapped);
  } catch (err) {
    logger.error('Import company error', err);
    throw err;
  }
};
