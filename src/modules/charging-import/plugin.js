'use strict';

const cron = require('node-cron');

const chargeVersionsJob = require('./jobs/charge-versions');
const chargingDataJob = require('./jobs/charging-data');

const { createRegister } = require('../../lib/plugin');
const config = require('../../../config');

const registerSubscribers = async server => {
  // Register handlers
  await server.messageQueue.subscribe(chargeVersionsJob.jobName, chargeVersionsJob.handler);
  await server.messageQueue.subscribe(chargingDataJob.jobName, chargingDataJob.handler);

  // Set up import of charge data on cron job
  cron.schedule(config.import.charging.schedule,
    () => server.messageQueue.publish(chargingDataJob.createMessage())
  );
};

const plugin = {
  name: 'importChargingData',
  dependencies: ['pgBoss'],
  register: server => createRegister(server, registerSubscribers)
};

module.exports = {
  plugin
};
