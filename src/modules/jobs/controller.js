'use strict';

const jobsConnector = require('../../lib/connectors/water-import/jobs');

const prettifyName = job => {
  job.name = job.name
    .replace('s3-', '')
    .replace(/-/g, ' ')
    .replace(/\./g, ': ')
    .replace('nald', 'NALD');

  if (job.name.startsWith('__state__completed__')) {
    job.name = job.name.replace('__state__completed__', '') + ': complete';
  }
  return job;
};

const getJobSummary = async () => {
  const summary = await jobsConnector.getJobSummary();
  return summary
    .map(prettifyName)
    .sort((a, b) => a.name.localeCompare(b.name));
};

exports.getJobSummary = getJobSummary;
