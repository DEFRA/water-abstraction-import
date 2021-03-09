'use strict';

const jobsConnector = require('../../lib/connectors/water-import/jobs');

const getJobSummary = async () => await jobsConnector.getJobSummary();

exports.getJobSummary = getJobSummary;
