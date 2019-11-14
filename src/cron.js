const chargingImport = require('./modules/charging-import/lib/import');
const cron = require('node-cron');

// Set up cron job to import data daily at 3am
cron.schedule('0 3 * * *', async () => {
  await chargingImport.importChargingData();
});
