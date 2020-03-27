const cron = require('node-cron');
const jobs = require('./jobs');
const { logger } = require('../../logger');

const chargingImport = require('./lib/import');
const isImportTarget = require('../../lib/is-import-target');

const registerSubscribers = async server => {
  // Import charging data
  await server.messageQueue.subscribe(jobs.IMPORT_CHARGING_DATA, chargingImport.importChargingData);

  // Set up cron job to import charge data every other day at 3:00pm
  cron.schedule('0 15 */2 * *', async () => {
    await server.messageQueue.publish(jobs.importChargingData());
  });
};

const register = server => {
  if (!isImportTarget()) {
    logger.info(`Aborting import, environment is: ${process.env.NODE_ENV}`);
    return;
  }
  return registerSubscribers(server);
};

exports.plugin = {
  name: 'importChargingData',
  dependencies: ['pgBoss'],
  register
};
