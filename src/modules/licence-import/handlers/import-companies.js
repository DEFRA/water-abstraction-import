const server = require('../../../../index.js');
const jobs = require('../jobs');

const extract = require('../extract');

module.exports = async job => {
  try {
    const rows = await extract.getAllParties();

    for (let row of rows) {
      await server.messageQueue.publish(...jobs.importCompany(row.FGAC_REGION_CODE, row.ID));
    }
  } catch (err) {
    console.error(`Import companies error`, err);
    throw err;
  }
};
