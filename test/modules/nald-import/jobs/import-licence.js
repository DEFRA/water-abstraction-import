'use strict';

const {
  afterEach,
  beforeEach,
  experiment,
  test
} = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');
const sandbox = require('sinon').createSandbox();

const { logger } = require('../../../../src/logger');

const importLicence = require('../../../../src/modules/nald-import/jobs/import-licence');
const licenceLoader = require('../../../../src/modules/nald-import/load');
const assertImportTablesExist = require('../../../../src/modules/nald-import/lib/assert-import-tables-exist');

experiment('modules/nald-import/jobs/import-licence', () => {
  beforeEach(async () => {
    sandbox.stub(logger, 'info');
    sandbox.stub(logger, 'error');

    sandbox.stub(licenceLoader, 'load');
    sandbox.stub(assertImportTablesExist, 'assertImportTablesExist');
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('.options', () => {
    test('has teamSize set to 100', async () => {
      expect(importLicence.options.teamSize).to.equal(100);
    });

    test('has teamConcurrency set to 2', async () => {
      expect(importLicence.options.teamConcurrency).to.equal(2);
    });
  });

  experiment('.createMessage', () => {
    test('formats a message for PG boss', async () => {
      const job = importLicence.createMessage('test-licence-number');

      expect(job).to.equal({
        data: {
          licenceNumber: 'test-licence-number'
        },
        name: 'nald-import.import-licence',
        options: { singletonKey: 'test-licence-number' }
      });
    });
  });

  experiment('.handler', () => {
    experiment('when the licence import was successful', () => {
      const job = {
        name: 'nald-import.import-licence',
        data: {
          licenceNumber: 'test-licence-number'
        }
      };

      beforeEach(async () => {
        await importLicence.handler(job);
      });

      test('a message is logged', async () => {
        const [message, params] = logger.info.lastCall.args;
        expect(message).to.equal('Handling job: nald-import.import-licence');
        expect(params).to.equal({
          licenceNumber: 'test-licence-number'
        });
      });

      test('asserts that the import tables exist', async () => {
        expect(assertImportTablesExist.assertImportTablesExist.called).to.be.true();
      });

      test('loads the requested licence', async () => {
        expect(licenceLoader.load.calledWith('test-licence-number')).to.be.true();
      });
    });

    experiment('when the licence import fails', () => {
      const err = new Error('Oops!');

      const job = {
        name: 'nald-import.import-licence',
        data: {
          licenceNumber: 'test-licence-number'
        }
      };

      beforeEach(async () => {
        assertImportTablesExist.assertImportTablesExist.throws(err);
      });

      test('logs an error message', async () => {
        const func = () => importLicence.handler(job);
        await expect(func()).to.reject();
        expect(logger.error.calledWith(
          'Error handling job nald-import.import-licence',
          err,
          { licenceNumber: 'test-licence-number' }
        )).to.be.true();
      });

      test('rethrows the error', async () => {
        const func = () => importLicence.handler(job);
        const err = await expect(func()).to.reject();
        expect(err.message).to.equal('Oops!');
      });
    });
  });
});
