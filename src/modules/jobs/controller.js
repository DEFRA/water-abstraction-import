'use strict'

const jobsConnector = require('../../lib/connectors/water-import/jobs')

const getJobSummary = () => jobsConnector.getJobSummary()

module.exports = {
  getJobSummary
}
