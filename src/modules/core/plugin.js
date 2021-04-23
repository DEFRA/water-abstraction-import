'use strict';

const cron = require('node-cron');
const config = require('../../../config');
const importTrackerJob = require('./jobs/import-tracker');
const moment = require('moment');

const getSchedule = () => config.isProduction ? '0 10 * * 1,2,3,4,5' : '0 15 * * 1,2,3,4,5';

const publishJob = messageQueue => {
  const timeStamp = moment().toISOString();
  messageQueue.publish(importTrackerJob.createMessage(timeStamp));
};

const subscribe = async (server, job) => {
  const { jobName, handler, options = {} } = job;

  await server.messageQueue.subscribe(jobName, options, handler);

  if (job.onCompleteHandler) {
    await server.messageQueue.onComplete(jobName, executedJob => job.onCompleteHandler(executedJob, server.messageQueue));
  }
};

const registerSubscribers = async server => {
  await subscribe(server, importTrackerJob);

  // Schedule the import process every day at 10am / 3pm depending on environment
  if (!process.env.TRAVIS) {
    cron.schedule(getSchedule(), () => publishJob(server.messageQueue));
  }
};

exports.plugin = {
  name: 'importTracker',
  dependencies: ['pgBoss'],
  register: registerSubscribers
};
