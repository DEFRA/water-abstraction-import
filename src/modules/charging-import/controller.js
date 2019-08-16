const chargingImport = require('./lib/import');

/**
 * Run SQL queries to import charge versions / elements into
 * water service tables from NALD import tables
 * @return {Promise}
 */
const postImportChargingData = async () => {
  await chargingImport.importChargingData();

  return {
    error: null
  };
};

exports.postImportChargingData = postImportChargingData;
