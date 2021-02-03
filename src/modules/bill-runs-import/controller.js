'use strict';

const importer = require('./lib/import');

const postImportBillRuns = async (request, h) => {
  await importer.importBillRuns();
  return {
    error: null
  };
};

exports.postImportBillRuns = postImportBillRuns;
