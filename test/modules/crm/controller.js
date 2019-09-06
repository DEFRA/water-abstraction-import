const { test, experiment, beforeEach, afterEach } = exports.lab = require('lab').script();
const { expect } = require('code');
const controller = require('../../../src/modules/crm/controller');
const crmImport = require('../../../src/modules/crm/lib/import');
const sandbox = require('sinon').createSandbox();

experiment('modules/crm/controller.js', () => {
  beforeEach(async() => {
    sandbox.stub(crmImport, 'importCRMData');
  });

  afterEach(async() => {
    sandbox.restore();
  });

  experiment('postImportCRMData', () => {
    let response;

    beforeEach(async() => {
      response = await controller.postImportCRMData();
    })

    test('imports the charging data', async() => {
      expect(crmImport.importCRMData.callCount).to.equal(1);
    });

    test('resolves with { error : null } HTTP response', async() => {
      expect(response).to.equal({ error: null });
    });
  })
});
