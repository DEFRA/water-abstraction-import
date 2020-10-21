'use strict';

const jobs = require('../jobs');

module.exports = async (messageQueue, job) =>
  messageQueue.publish(jobs.importCompanies());
