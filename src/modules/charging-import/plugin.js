const cron = require('node-cron');
const jobs = require('./jobs');

const chargingImport = require('./lib/import');
const { createRegister } = require('../../lib/plugin');

// run at 1000 Mon, Weds and Fri
const cronSchedule = '0 10 * * 1,3,5';

const registerSubscribers = async server => {
  // Import charging data
  await server.messageQueue.subscribe(jobs.IMPORT_CHARGING_DATA, chargingImport.importChargingData);

  cron.schedule(cronSchedule, async () => {
    await server.messageQueue.publish(jobs.importChargingData());
  });
};

exports.plugin = {
  name: 'importChargingData',
  dependencies: ['pgBoss'],
  register: server => createRegister(server, registerSubscribers)
};
