const { test, experiment, beforeEach, afterEach } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');
const controller = require('../../../src/modules/charging-import/controller');
const chargingImport = require('../../../src/modules/charging-import/lib/import');
const sandbox = require('sinon').createSandbox();

experiment('modules/charging-import/controller.js', () => {
  beforeEach(async () => {
    sandbox.stub(chargingImport, 'importChargingData');
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('postImportChargingData', () => {
    let response;

    beforeEach(async () => {
      response = await controller.postImportChargingData();
    });

    test('imports the charging data', async () => {
      expect(chargingImport.importChargingData.callCount).to.equal(1);
    });

    test('resolves with { error : null } HTTP response', async () => {
      expect(response).to.equal({ error: null });
    });
  });
});
