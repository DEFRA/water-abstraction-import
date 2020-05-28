'use strict';

const jobsConnector = require('../../lib/connectors/water-import/jobs');

const getJobSummary = async () => {
  const summary = await jobsConnector.getJobSummary();
  return summary;
};

exports.getJobSummary = getJobSummary;
