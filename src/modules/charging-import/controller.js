'use strict';

const { partial } = require('lodash');

const chargeVersionsJob = require('./jobs/charge-versions');

const createPostHandler = async (createMessage, request) => {
  await request.messageQueue.publish(createMessage());

  return {
    error: null
  };
};

/**
 * Run SQL queries to import charge versions / elements into
 * water service tables from NALD import tables
 * @return {Promise}
 */
const postImportChargingData = partial(createPostHandler, chargeVersionsJob.createMessage);

exports.postImportChargingData = postImportChargingData;
