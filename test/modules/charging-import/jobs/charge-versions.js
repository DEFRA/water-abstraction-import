const { test, experiment, beforeEach, afterEach } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');

const queryLoader = require('../../../../src/modules/charging-import/lib/query-loader');
const chargeVersionsJob = require('../../../../src/modules/charging-import/jobs/charge-versions');
const chargeVersionQueries = require('../../../../src/modules/charging-import/lib/queries/charging');

const sandbox = require('sinon').createSandbox();

experiment('modules/charging-import/jobs/charge-versions.js', () => {
  beforeEach(async () => {
    sandbox.stub(queryLoader, 'loadQueries');
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('.handler', () => {
    beforeEach(async () => {
      chargeVersionsJob.handler();
    });

    test('runs the correct queries', async () => {
      expect(queryLoader.loadQueries.calledWith(
        'Import charge versions',
        [
          chargeVersionQueries.importChargeVersions,
          chargeVersionQueries.importChargeElements,
          chargeVersionQueries.cleanupChargeElements,
          chargeVersionQueries.cleanupChargeVersions
        ]
      )).to.be.true();
    });
  });
});
