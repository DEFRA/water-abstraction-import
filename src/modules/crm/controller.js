const crmImport = require('./lib/import');

/**
 * Run SQL queries to import charge versions / elements into
 * water service tables from NALD import tables
 * @return {Promise}
 */
const postImportCRMData = async () => {
  await crmImport.importCRMData();

  return {
    error: null
  };
};

exports.postImportCRMData = postImportCRMData;
