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
      const subTitle = jobs.length > 1 ? `There are ${jobs.length} failed import jobs in the` : 'There is 1 failed import job in the';
      const content = `${subTitle} ${process.env.NODE_ENV} environment.\n\n` +
      jobs.reduce((acc, row) => {
        acc = acc + `Job Name: ${row.jobName} \nTotal Errors: ${row.total} \nDate created: ${row.dateCreated} \nDate completed: ${row.dateCompleted}\n\n`;
        return acc;
      }, '');
      const environment = process.env.NODE_ENV;
      if (environment === PRODUCTION || environment === PREPROD) {
        notifyService.sendEmail(process.env.WATER_SERVICE_MAILBOX, 'service_status_alert', { content });
      }
      slack.post(content);
    }
  } catch (err) {
    logger.error(`Error handling job ${job.name}`, err);
    throw err;
  }
};

exports.createMessage = createMessage;
exports.handler = handler;
exports.jobName = JOB_NAME;
