'use strict';

const cron = require('node-cron');
const config = require('../../../config');
const jobs = require('./jobs');

const getSchedule = () => config.isProduction ? '0 1 * * *' : '0 */1 * * *';

const publishJob = messageQueue => {
  messageQueue.publish(jobs.s3Download.job.createMessage());
};

const subscribe = async (server, job) => {
  const { jobName, handler, options = {} } = job.job;

  await server.messageQueue.subscribe(jobName, options, handler);

  if (job.onCompleteHandler) {
    await server.messageQueue.onComplete(jobName, executedJob => {
      return job.onCompleteHandler(executedJob, server.messageQueue);
    });
  }
};

const registerSubscribers = async server => {
  await subscribe(server, jobs.s3Download);
  await subscribe(server, jobs.deleteRemovedDocuments);
  await subscribe(server, jobs.populatePendingImport);
  await subscribe(server, jobs.importLicence);

  // Schedule the import process every day at 1am / 1pm depending on environment
  if (!process.env.TRAVIS) {
    cron.schedule(getSchedule(), () => publishJob(server.messageQueue));
  }
};

exports.plugin = {
  name: 'importNaldData',
  dependencies: ['pgBoss'],
  register: registerSubscribers
};
