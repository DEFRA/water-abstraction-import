const { test, experiment, beforeEach, afterEach } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');

const queryLoader = require('../../../../src/modules/charging-import/lib/query-loader');
const chargingDataJob = require('../../../../src/modules/charging-import/jobs/charging-data');
const purposesQueries = require('../../../../src/modules/charging-import/lib/queries/purposes');
const returnVersionQueries = require('../../../../src/modules/charging-import/lib/queries/return-versions');
const financialAgreementTypeQueries = require('../../../../src/modules/charging-import/lib/queries/financial-agreement-types');

const sandbox = require('sinon').createSandbox();

experiment('modules/charging-import/jobs/charging-data.js', () => {
  beforeEach(async () => {
    sandbox.stub(queryLoader, 'loadQueries');
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('.handler', () => {
    beforeEach(async () => {
      chargingDataJob.handler();
    });

    test('runs the correct queries', async () => {
      expect(queryLoader.loadQueries.calledWith(
        'Import charging data',
        [
          financialAgreementTypeQueries.importFinancialAgreementTypes,
          purposesQueries.importPrimaryPurposes,
          purposesQueries.importSecondaryPurposes,
          purposesQueries.importUses,
          purposesQueries.importValidPurposeCombinations,
          returnVersionQueries.importReturnVersions,
          returnVersionQueries.importReturnRequirements,
          returnVersionQueries.importReturnRequirementPurposes
        ]
      )).to.be.true();
    });
  });
});
