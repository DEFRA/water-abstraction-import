const extract = require('../extract');
const transform = require('../transform');
const load = require('../load');
const { logger } = require('../../../logger');

module.exports = async job => {
  logger.info(`Import company ${job.data.regionCode} ${job.data.partyId}`);

  try {
    // Extract data
    const data = await extract.getCompanyData(job.data.regionCode, job.data.partyId);

    // Transform to new structure
    const mapped = transform.company.transformCompany(data);

    // Load to CRM database
    await load.company.loadCompany(mapped);
  } catch (err) {
    console.error(err);
    throw err;
  }
};
