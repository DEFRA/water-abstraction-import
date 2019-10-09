const { test, experiment, beforeEach, afterEach } = exports.lab = require('lab').script();
const { expect } = require('code');
const crmImport = require('../../../../src/modules/crm/lib/import');
const { logger } = require('../../../../src/logger');
const sandbox = require('sinon').createSandbox();
const { pool } = require('../../../../src/lib/connectors/db');

const documentQueries = require('../../../../src/modules/crm/lib/queries/documents');

experiment('modules/crm-import/controller.js', () => {
  beforeEach(async() => {
    sandbox.stub(logger, 'info');
    sandbox.stub(logger, 'error');
    sandbox.stub(pool, 'query');
  });

  afterEach(async() => {
    sandbox.restore();
  });

  experiment('importCRMData', () => {
    experiment('when there are no errors', () => {
      beforeEach(async() => {
        await crmImport.importCRMData();
      });

      test('logs info messages', async() => {
        expect(logger.info.callCount).to.equal(2);
      });

      test('does not log error messages', async() => {
        expect(logger.error.callCount).to.equal(0);
      });

      test('runs each query in sequence', async() => {
          expect(pool.query.getCall(0).args[0]).to.equal(documentQueries.importDocumentHeaders);
      });
    });

  });
});
