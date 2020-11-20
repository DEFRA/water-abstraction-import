const cron = require('node-cron');
const jobs = require('./jobs');

const chargingImport = require('./lib/import');
const chargeVersionMetadataImport = require('./lib/import-charge-version-metadata');

const { createRegister } = require('../../lib/plugin');
const config = require('../../../config');

const registerSubscribers = async server => {
  // Register PG boss job handlers
  await server.messageQueue.subscribe(jobs.IMPORT_CHARGING_DATA, chargingImport.importChargingData);
  await server.messageQueue.subscribe(jobs.IMPORT_CHARGE_VERSION_METADATA, chargeVersionMetadataImport.importChargeVersionMetadata);

  cron.schedule(config.import.charging.schedule, async () => {
    await server.messageQueue.publish(jobs.importChargingData());
    await server.messageQueue.publish(jobs.importChargeVersionMetadata());
  });
};

exports.plugin = {
  name: 'importChargingData',
  dependencies: ['pgBoss'],
  register: server => createRegister(server, registerSubscribers)
};
