const { test, experiment, beforeEach, afterEach, fail } = exports.lab = require('@hapi/lab').script();
const sandbox = require('sinon').createSandbox();
const handlers = require('../../../../src/modules/licence-import/handlers');
const extract = require('../../../../src/modules/licence-import/extract');
const transform = require('../../../../src/modules/licence-import/transform');
const load = require('../../../../src/modules/licence-import/load');
const importCompanies = require('../../../../src/modules/licence-import/connectors/import-companies');

const { logger } = require('../../../../src/logger');

const server = require('../../../../index.js');
const { expect } = require('@hapi/code');

experiment('modules/licence-import/transform/handlers', () => {
  beforeEach(async () => {
    sandbox.stub(logger, 'error');
    sandbox.stub(logger, 'info');
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('importLicences', () => {
    beforeEach(async () => {
      sandbox.stub(server.messageQueue, 'publish');
      sandbox.stub(extract, 'getAllLicenceNumbers').resolves([
        { LIC_NO: 'A' },
        { LIC_NO: 'B' }
      ]);
    });

    experiment('importLicences', () => {
      experiment('when there are no errors', () => {
        beforeEach(async () => {
          await handlers.importLicences();
        });

        test('an info message is logged', async () => {
          expect(logger.info.callCount).to.equal(1);
        });

        test('list of licences/region codes/parties are loaded', async () => {
          expect(extract.getAllLicenceNumbers.callCount).to.equal(1);
        });

        test('import licence jobs are published for the first licence', async () => {
          const [{ name, data }] = server.messageQueue.publish.getCall(0).args;
          expect(name).to.equal('import.licence');
          expect(data.licenceNumber).to.equal('A');
        });

        test('import licence jobs are published for the second licence', async () => {
          const [{ name, data }] = server.messageQueue.publish.getCall(1).args;
          expect(name).to.equal('import.licence');
          expect(data.licenceNumber).to.equal('B');
        });
      });

      experiment('when there is an error', () => {
        beforeEach(async () => {
          extract.getAllLicenceNumbers.throws();
        });

        test('error is logged and rethrown', async () => {
          try {
            await handlers.importLicences();
            fail();
          } catch (err) {
            expect(logger.error.callCount).to.equal(1);
            expect(logger.error.lastCall.args[0]).to.equal('Import licences error');
          }
        });
      });
    });
  });

  experiment('importLicence', () => {
    const jobData = { data: { licenceNumber: 'A' } };

    beforeEach(async () => {
      sandbox.stub(extract, 'getLicenceData').resolves({
        foo: 'bar'
      });
      sandbox.stub(transform.licence, 'transformLicence').returns({
        bar: 'foo'
      });
      sandbox.stub(load.licence, 'loadLicence');
    });

    experiment('when there are no errors', () => {
      beforeEach(async () => {
        await handlers.importLicence(jobData);
      });

      test('an info message is logged', async () => {
        expect(logger.info.callCount).to.equal(1);
      });

      test('extract.getLicenceData is called', async () => {
        expect(extract.getLicenceData.calledWith(jobData.data.licenceNumber)).to.be.true();
      });

      test('raw licence data is transformed', async () => {
        expect(transform.licence.transformLicence.calledWith({ foo: 'bar' })).to.be.true();
      });

      test('transformed licence data is stored', async () => {
        expect(load.licence.loadLicence.calledWith({ bar: 'foo' })).to.be.true();
      });
    });

    experiment('when there is an error', () => {
      beforeEach(async () => {
        extract.getLicenceData.rejects();
      });

      test('error is logged and rethrown', async () => {
        try {
          await handlers.importLicence();
          fail();
        } catch (err) {
          expect(logger.error.callCount).to.equal(1);
          expect(logger.error.lastCall.args[0]).to.equal('Import licence error');
        }
      });
    });
  });

  experiment('importCompany', () => {
    const jobData = { data: { regionCode: '1', partyId: '101' } };

    beforeEach(async () => {
      sandbox.stub(extract, 'getCompanyData').resolves({
        foo: 'bar'
      });
      sandbox.stub(transform.company, 'transformCompany').returns({
        bar: 'foo'
      });
      sandbox.stub(load.company, 'loadCompany');
      sandbox.stub(importCompanies, 'setImportedStatus');
    });

    experiment('when there are no errors', () => {
      beforeEach(async () => {
        await handlers.importCompany(jobData);
      });

      test('an info message is logged', async () => {
        expect(logger.info.callCount).to.equal(1);
      });

      test('extract.getCompanyData is called', async () => {
        expect(extract.getCompanyData.calledWith(
          jobData.data.regionCode, jobData.data.partyId
        )).to.be.true();
      });

      test('raw company data is transformed', async () => {
        expect(transform.company.transformCompany.calledWith({ foo: 'bar' })).to.be.true();
      });

      test('transformed company data is stored', async () => {
        expect(load.company.loadCompany.calledWith({ bar: 'foo' })).to.be.true();
      });
    });

    experiment('when there is an error', () => {
      beforeEach(async () => {
        extract.getCompanyData.rejects();
      });

      test('error is logged and rethrown', async () => {
        try {
          await handlers.importCompany();
          fail();
        } catch (err) {
          expect(logger.error.callCount).to.equal(1);
          expect(logger.error.lastCall.args[0]).to.equal('Import company error');
        }
      });
    });
  });

  experiment('importCompanies', () => {
    let result;

    beforeEach(async () => {
      sandbox.stub(importCompanies, 'clear');
    });

    experiment('when there are no errors', () => {
      beforeEach(async () => {
        sandbox.stub(importCompanies, 'initialise').resolves([
          {
            region_code: 1,
            party_id: 123
          }
        ]);
        result = await handlers.importCompanies();
      });

      test('logs an info message', async () => {
        expect(logger.info.calledWith(
          'Import companies'
        )).to.be.true();
      });

      test('clears existing import_companies table data', async () => {
        expect(importCompanies.clear.called).to.be.true();
      });

      test('initialises the import_companies table with new data', async () => {
        expect(importCompanies.initialise.called).to.be.true();
      });

      test('resolves with mapped list of region codes/party IDs', async () => {
        expect(result).to.equal([{
          regionCode: 1,
          partyId: 123
        }]);
      });
    });

    experiment('when there are errors', () => {
      beforeEach(async () => {
        sandbox.stub(importCompanies, 'initialise').rejects();
      });

      test('an error is logged and rethrown', async () => {
        try {
          await handlers.importCompanies();
          fail();
        } catch (err) {
          expect(logger.error.called).to.be.true();
        }
      });
    });
  });

  experiment('onComplete importCompanies', () => {
    let messageQueue;

    beforeEach(async () => {
      messageQueue = {
        publish: sandbox.stub()
      };
      const job = {
        data: {
          response: {
            value: [{
              regionCode: 1,
              partyId: 123
            }]
          }
        }
      };
      await handlers.onCompleteImportCompanies(messageQueue, job);
    });

    test('a job is published to import each company', async () => {
      const [{ name, data }] = messageQueue.publish.lastCall.args;
      expect(name).to.equal('import.company');
      expect(data).to.equal({
        regionCode: 1, partyId: 123
      });
    });
  });

  experiment('onComplete importCompany', () => {
    let messageQueue;

    beforeEach(async () => {
      sandbox.stub(importCompanies, 'getPendingCount');
      messageQueue = {
        deleteQueue: sandbox.stub(),
        publish: sandbox.stub()
      };
    });

    experiment('when there are still companies to import', () => {
      beforeEach(async () => {
        importCompanies.getPendingCount.resolves(5);
        await handlers.onCompleteImportCompany(messageQueue);
      });

      test('the queue is not deleted', async () => {
        expect(messageQueue.deleteQueue.called).to.be.false();
      });

      test('the import licences job is not published', async () => {
        expect(messageQueue.publish.called).to.be.false();
      });
    });

    experiment('when all the companies are imported', () => {
      beforeEach(async () => {
        importCompanies.getPendingCount.resolves(0);
        await handlers.onCompleteImportCompany(messageQueue);
      });

      test('the queue is deleted', async () => {
        expect(messageQueue.deleteQueue.called).to.be.true();
      });

      test('the import licences job is published', async () => {
        const [{ name }] = messageQueue.publish.lastCall.args;
        expect(name).to.equal('import.licences');
      });
    });
  });
});
