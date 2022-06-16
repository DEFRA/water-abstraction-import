'use strict';

const constants = require('./lib/constants');

const postImportBillRuns = async request => {
  await request.messageQueue.publish(constants.IMPORT_BILL_RUNS);
  return {
    error: null
  };
};

module.exports = {
  postImportBillRuns
};
