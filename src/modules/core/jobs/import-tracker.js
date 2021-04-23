'use strict';

const { logger } = require('../../../logger');
const JOB_NAME = 'import.tracker';
const PREPROD = 'preprod';
const PRODUCTION = 'production';
const slack = require('../../../lib/slack');
const jobsConnector = require('../../../lib/connectors/water-import/jobs');
const notifyService = require('../../../lib/services/notify');
const createMessage = () => ({
  name: JOB_NAME,
  options: {
    singletonKey: JOB_NAME
  }
});

/**
 * Imports a single licence
 * @param {Object} job
 * @param {String} job.data.licenceNumber
 */
const handler = async job => {
  logger.info(`Handling job: ${job.name}`);

  try {
    const jobs = await jobsConnector.getFailedJobs();
    // if there are any jobs that have failed in the last 12 hours
    if (jobs.length > 0) {
      const message = `WRLS Import summary of failed jobs in the ${process.env.NODE_ENV} environment\n` +
      jobs.reduce((acc, row) => {
        acc = acc + `Job Name: ${row.jobName} \nTotal Errors: ${row.total} \nDate failed: ${row.dateFailed}\n\n`;
        return acc;
      }, '');
      const environment = process.env.NODE_ENV;
      if (environment === PRODUCTION || environment === PREPROD) {
        notifyService.sendNotifyMessage('service_status_alert', { recipient: process.env.WATER_SERVICE_MAILBOX, personalisation: { content: message } });
      }
      slack.post(message);
    }
  } catch (err) {
    logger.error(`Error handling job ${job.name}`, err);
    throw err;
  }
};

exports.createMessage = createMessage;
exports.handler = handler;
exports.jobName = JOB_NAME;
