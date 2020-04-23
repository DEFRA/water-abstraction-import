const cron = require('node-cron');
const jobs = require('./jobs');

const chargingImport = require('./lib/import');
const { createRegister } = require('../../lib/plugin');

const registerSubscribers = async server => {
  // Import charging data
  await server.messageQueue.subscribe(jobs.IMPORT_CHARGING_DATA, chargingImport.importChargingData);

  // Set up cron job to import charge data every other day at 3:00pm
  cron.schedule('0 15 */2 * *', async () => {
    await server.messageQueue.publish(jobs.importChargingData());
  });
};

exports.plugin = {
  name: 'importChargingData',
  dependencies: ['pgBoss'],
  register: server => createRegister(server, registerSubscribers)
};
