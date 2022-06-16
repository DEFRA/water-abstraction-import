'use strict';

/**
 * @note: this can be removed following go live and migration to service
 */

const job = require('../lib/job');
const queryLoader = require('../lib/query-loader');
const chargingQueries = require('../lib/queries/charging');

const jobName = 'import.charge-versions';

const createMessage = () => job.createMessage(jobName);

const handler = () => queryLoader.loadQueries('Import charge versions', [
  chargingQueries.importChargeVersions,
  chargingQueries.importChargeElements,
  chargingQueries.cleanupChargeElements,
  chargingQueries.cleanupChargeVersions
]);

module.exports = {
  jobName,
  createMessage,
  handler
};
