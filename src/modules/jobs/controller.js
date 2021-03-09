'use strict';

const jobsConnector = require('../../lib/connectors/water-import/jobs');

const getJobSummary = () => jobsConnector.getJobSummary();

exports.getJobSummary = getJobSummary;
