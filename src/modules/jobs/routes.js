'use strict';

const controller = require('./controller');

const getJobSummary = {
  method: 'GET',
  path: '/import/1.0/jobs/summary',
  handler: controller.getJobSummary
};

module.exports = [getJobSummary];
