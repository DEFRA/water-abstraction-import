'use strict';

const { partial } = require('lodash');
const jobs = require('./jobs');

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
const postImportChargingData = partial(createPostHandler, jobs.importChargingData);

exports.postImportChargingData = postImportChargingData;
