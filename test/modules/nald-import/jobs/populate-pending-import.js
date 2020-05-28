const { afterEach, beforeEach, experiment, test } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');
const sandbox = require('sinon').createSandbox();

const { logger } = require('../../../../src/logger');
const importService = require('../../../../src/lib/services/import');
const populatePendingImport = require('../../../../src/modules/nald-import/jobs/populate-pending-import');
const assertImportTablesExist = require('../../../../src/modules/nald-import/lib/assert-import-tables-exist');

experiment('modules/nald-import/jobs/populate-pending-import', () => {
  beforeEach(async () => {
    sandbox.stub(logger, 'info');
    sandbox.stub(logger, 'error');

    sandbox.stub(assertImportTablesExist, 'assertImportTablesExist');

    sandbox.stub(importService, 'getLicenceNumbers').resolves([
      'licence-1-id',
      'licence-2-id'
    ]);
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('.createMessage', () => {
    test('formats a message for PG boss', async () => {
      const job = populatePendingImport.createMessage();
      expect(job).to.equal({
        name: 'nald-import.populate-pending-import',
        options: {
          expireIn: '1 hours',
          singletonKey: 'nald-import.populate-pending-import'
        }
      });
    });
  });

  experiment('.handler', () => {
    let result;

    experiment('when the job is successful', () => {
      const job = {
        name: 'nald-import.populate-pending-import'
      };

      beforeEach(async () => {
        result = await populatePendingImport.handler(job);
      });

      test('a message is logged', async () => {
        const [message] = logger.info.lastCall.args;
        expect(message).to.equal('Handling job: nald-import.populate-pending-import');
      });

      test('asserts that the import tables exist', async () => {
        expect(assertImportTablesExist.assertImportTablesExist.called).to.be.true();
      });

      test('retrieves the licence numbers', async () => {
        expect(importService.getLicenceNumbers.called).to.be.true();
      });

      test('resolves with an array of licence numbers to import', async () => {
        expect(result).to.equal({
          licenceNumbers: [
            'licence-1-id',
            'licence-2-id'
          ]
        });
      });
    });

    experiment('when the job fails', () => {
      const err = new Error('Oops!');

      const job = {
        name: 'nald-import.populate-pending-import'
      };

      beforeEach(async () => {
        assertImportTablesExist.assertImportTablesExist.throws(err);
      });

      test('logs an error message', async () => {
        const func = () => populatePendingImport.handler(job);
        await expect(func()).to.reject();
        expect(logger.error.calledWith(
          'Error handling job nald-import.populate-pending-import', err
        )).to.be.true();
      });

      test('rethrows the error', async () => {
        const func = () => populatePendingImport.handler(job);
        const err = await expect(func()).to.reject();
        expect(err.message).to.equal('Oops!');
      });
    });
  });
});
