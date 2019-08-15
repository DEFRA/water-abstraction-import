const { test, experiment, beforeEach, afterEach } = exports.lab = require('lab').script();
const { expect } = require('code');
const chargingImport = require('../../../src/modules/charging-import');
const { logger } = require('../../../src/logger');
const sandbox = require('sinon').createSandbox();
const { pool } = require('../../../src/lib/connectors/db');

const queries = require('../../../src/modules/charging-import/queries');

experiment('modules/charging-import/index.js', () => {

  beforeEach(async() => {
    sandbox.stub(logger, 'info');
    sandbox.stub(pool, 'query');
  });

  afterEach(async() => {
    sandbox.restore();
  });


  experiment('importChargingData', () => {

    beforeEach(async() => {
      await chargingImport.importChargingData();
    })
    test('logs info messages', async() => {
      expect(logger.info.callCount).to.equal(2);
    });

    test('runs each query in sequence', async() => {
        expect(pool.query.getCall(0).args[0]).to.equal(queries.createChargeVersionGuids);
        expect(pool.query.getCall(1).args[0]).to.equal(queries.createChargeElementGuids);
        expect(pool.query.getCall(2).args[0]).to.equal(queries.createChargeAgreementGuids);
        expect(pool.query.getCall(3).args[0]).to.equal(queries.importChargeVersions);
        expect(pool.query.getCall(4).args[0]).to.equal(queries.importChargeElements);
        expect(pool.query.getCall(5).args[0]).to.equal(queries.importChargeAgreements);
    });
  })


});
