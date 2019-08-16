const { test, experiment, beforeEach, afterEach } = exports.lab = require('lab').script();
const { expect } = require('code');
const chargingImport = require('../../../../src/modules/charging-import/lib/import');
const { logger } = require('../../../../src/logger');
const sandbox = require('sinon').createSandbox();
const { pool } = require('../../../../src/lib/connectors/db');

const queries = require('../../../../src/modules/charging-import/lib/queries');
const checkIntegrity = require('../../../../src/modules/charging-import/lib/check-integrity');

experiment('modules/charging-import/index.js', () => {

  beforeEach(async() => {
    sandbox.stub(logger, 'info');
    sandbox.stub(logger, 'error');
    sandbox.stub(pool, 'query');
    sandbox.stub(checkIntegrity, 'verify');
  });

  afterEach(async() => {
    sandbox.restore();
  });

  experiment('importChargingData', () => {

    experiment('when there are no errors', () => {
      beforeEach(async() => {
        checkIntegrity.verify.resolves({
          totalErrors: 0
        })
        await chargingImport.importChargingData();
      });

      test('logs info messages', async() => {
        expect(logger.info.callCount).to.equal(3);
      });

      test('does not log error messages', async() => {
        expect(logger.error.callCount).to.equal(0);
      });


      test('runs each query in sequence', async() => {
          expect(pool.query.getCall(0).args[0]).to.equal(queries.createChargeVersionGuids);
          expect(pool.query.getCall(1).args[0]).to.equal(queries.createChargeElementGuids);
          expect(pool.query.getCall(2).args[0]).to.equal(queries.createChargeAgreementGuids);
          expect(pool.query.getCall(3).args[0]).to.equal(queries.importChargeVersions);
          expect(pool.query.getCall(4).args[0]).to.equal(queries.importChargeElements);
          expect(pool.query.getCall(5).args[0]).to.equal(queries.importChargeAgreements);
      });
    });

    experiment('when there are errors', () => {
      beforeEach(async() => {
        checkIntegrity.verify.resolves({
          totalErrors: 1
        })
        await chargingImport.importChargingData();
      });

      test('logs error message', async() => {
        expect(logger.error.callCount).to.equal(1);
      });

    });


  });


});
