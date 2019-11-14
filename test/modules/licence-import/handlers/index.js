const { test, experiment, beforeEach, afterEach, fail } = exports.lab = require('lab').script();
const sandbox = require('sinon').createSandbox();
const handlers = require('../../../../src/modules/licence-import/handlers');
const extract = require('../../../../src/modules/licence-import/extract');
const transform = require('../../../../src/modules/licence-import/transform');
const load = require('../../../../src/modules/licence-import/load');

const { logger } = require('../../../../src/logger');

const server = require('../../../../index.js');
const { expect } = require('code');

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
        { LIC_NO: 'A', FGAC_REGION_CODE: '1', ACON_APAR_ID: '1' },
        { LIC_NO: 'A', FGAC_REGION_CODE: '1', ACON_APAR_ID: '2' },
        { LIC_NO: 'B', FGAC_REGION_CODE: '1', ACON_APAR_ID: '3' }
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

        test('import licence and company jobs are published for the first licence', async () => {
          expect(server.messageQueue.publish.calledWith(
            'import.licence', { licenceNumber: 'A' }
          )).to.be.true();
          expect(server.messageQueue.publish.calledWith(
            'import.company', { regionCode: '1', partyId: '1' }
          )).to.be.true();
          expect(server.messageQueue.publish.calledWith(
            'import.company', { regionCode: '1', partyId: '2' }
          )).to.be.true();
        });

        test('import licence and company jobs are published for the second licence', async () => {
          expect(server.messageQueue.publish.calledWith(
            'import.licence', { licenceNumber: 'B' }
          )).to.be.true();
          expect(server.messageQueue.publish.calledWith(
            'import.company', { regionCode: '1', partyId: '3' }
          )).to.be.true();
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
});
