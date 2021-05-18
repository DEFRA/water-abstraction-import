'use strict';

const jobs = require('../jobs');

module.exports = async (messageQueue, job) => {
  return messageQueue.publish(jobs.importPurposeConditionTypes());
};
