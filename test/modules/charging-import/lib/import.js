const { test, experiment, beforeEach, afterEach } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');
const chargingImport = require('../../../../src/modules/charging-import/lib/import');
const { logger } = require('../../../../src/logger');
const sandbox = require('sinon').createSandbox();
const { pool } = require('../../../../src/lib/connectors/db');

const chargingQueries = require('../../../../src/modules/charging-import/lib/queries/charging');
const returnVersionQueries = require('../../../../src/modules/charging-import/lib/queries/return-versions');
const financialAgreementTypeQueries = require('../../../../src/modules/charging-import/lib/queries/financial-agreement-types');
const purposesQueries = require('../../../../src/modules/charging-import/lib/queries/purposes');
const returnVersionQueries = require('../../../../src/modules/charging-import/lib/queries/return-versions');
const chargeVersionImportService = require('../../../../src/modules/charging-import/services/charge-version-import');

experiment('modules/charging-import/index.js', () => {
  beforeEach(async () => {
    sandbox.stub(logger, 'info');
    sandbox.stub(logger, 'error');
    sandbox.stub(pool, 'query');
    sandbox.stub(chargeVersionImportService, 'importChargeVersions');
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('importChargingData', () => {
    experiment('when an unexpected error is thrown', () => {
      beforeEach(async () => {
        pool.query.rejects(new Error('oops!'));
      });

      test('the error is logged and rethrown', async () => {
        const func = () => chargingImport.importChargingData();
        const err = await expect(func()).to.reject();
        expect(logger.error.calledWith(err));
      });
    });

    experiment('when there are no errors', () => {
      beforeEach(async () => {
        await chargingImport.importChargingData();
      });

      test('runs the charge version import process', async () => {
        expect(chargeVersionImportService.importChargeVersions.called).to.be.true();
      });

      test('logs info messages', async () => {
        expect(logger.info.callCount).to.equal(2);
      });

      test('does not log error messages', async () => {
        expect(logger.error.callCount).to.equal(0);
      });

      test('runs each query in sequence', async () => {
        expect(pool.query.getCall(0).args[0]).to.equal(financialAgreementTypeQueries.importFinancialAgreementTypes);
        expect(pool.query.getCall(1).args[0]).to.equal(purposesQueries.importPrimaryPurposes);
        expect(pool.query.getCall(2).args[0]).to.equal(purposesQueries.importSecondaryPurposes);
        expect(pool.query.getCall(3).args[0]).to.equal(purposesQueries.importUses);
        expect(pool.query.getCall(4).args[0]).to.equal(purposesQueries.importValidPurposeCombinations);
        expect(pool.query.getCall(5).args[0]).to.equal(chargingQueries.importChargeElements);
        expect(pool.query.getCall(6).args[0]).to.equal(chargingQueries.cleanupChargeElements);
        expect(pool.query.getCall(7).args[0]).to.equal(returnVersionQueries.importReturnVersions);
        expect(pool.query.getCall(8).args[0]).to.equal(returnVersionQueries.importReturnRequirements);
        expect(pool.query.getCall(9).args[0]).to.equal(returnVersionQueries.importReturnRequirementPurposes);
      });
    });
  });
});
