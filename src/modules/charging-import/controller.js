const jobs = require('./jobs');

/**
 * Run SQL queries to import charge versions / elements into
 * water service tables from NALD import tables
 * @return {Promise}
 */
const postImportChargingData = async request => {
  await request.messageQueue.publish(jobs.importChargingData());

  return {
    error: null
  };
};

exports.postImportChargingData = postImportChargingData;
