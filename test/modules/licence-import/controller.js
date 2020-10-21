const { test, experiment, beforeEach, afterEach } = exports.lab = require('@hapi/lab').script();
const sandbox = require('sinon').createSandbox();
const jobs = require('../../../src/modules/licence-import/jobs');
const controller = require('../../../src/modules/licence-import/controller');
const { logger } = require('../../../src/logger.js');
const { expect } = require('@hapi/code');

const createRequest = () => ({
  query: {},
  messageQueue: {
    publish: sandbox.stub().resolves()
  }
});

experiment('modules/licence-import/controller.js', () => {
  let h;

  experiment('.postImport', () => {
    let request, response;

    beforeEach(async () => {
      sandbox.stub(logger, 'error');
      h = {
        response: sandbox.stub().returnsThis(),
        code: sandbox.stub()
      };
    });

    afterEach(async () => {
      sandbox.restore();
    });

    experiment('when there are no errors', () => {
      beforeEach(async () => {
        request = createRequest();
        response = await controller.postImport(request, h);
      });

      test('an "import delete documents" job is published', async () => {
        expect(request.messageQueue.publish.callCount).to.equal(1);
        const [job] = request.messageQueue.publish.lastCall.args;
        expect(job.name).to.equal(jobs.DELETE_DOCUMENTS_JOB);
      });

      test('a success response is returned', async () => {
        expect(h.response.calledWith({ error: null })).to.be.true();
      });

      test('a 202 http status code is returned', async () => {
        expect(h.code.calledWith(202)).to.be.true();
      });
    });

    experiment('when there is an error', () => {
      beforeEach(async () => {
        request = createRequest();
        request.messageQueue.publish.rejects();
        response = await controller.postImport(request, h);
      });

      test('an error is logged', async () => {
        expect(logger.error.callCount).to.equal(1);
        const [message] = logger.error.lastCall.args;
        expect(message).to.equal('Error importing companies');
      });

      test('a Boom 500 error is returned', async () => {
        expect(response.isBoom).to.equal(true);
        expect(response.output.statusCode).to.equal(500);
      });
    });
  });

  experiment('.postImportLicence', () => {
    let request;
    let h;
    let response;
    let code;

    beforeEach(async () => {
      sandbox.stub(logger, 'error');
      code = sandbox.spy();

      h = {
        response: sandbox.stub().returns({ code })
      };
    });

    afterEach(async () => {
      sandbox.restore();
    });

    experiment('when there are no errors', () => {
      beforeEach(async () => {
        request = createRequest();
        request.query.licenceNumber = 'test-lic';
        await controller.postImportLicence(request, h);
      });

      test('an "import licence" job is published', async () => {
        expect(request.messageQueue.publish.callCount).to.equal(1);
        const [job] = request.messageQueue.publish.lastCall.args;
        expect(job.name).to.equal(jobs.IMPORT_LICENCE_JOB);
      });

      test('a success response is returned', async () => {
        const [data] = h.response.lastCall.args;
        const [statusCode] = code.lastCall.args;

        expect(data).to.equal({ error: null });
        expect(statusCode).to.equal(202);
      });
    });

    experiment('when there is an error', () => {
      beforeEach(async () => {
        request = createRequest();
        request.query.licenceNumber = 'test-lic';
        request.messageQueue.publish.rejects();
        response = await controller.postImportLicence(request, h);
      });

      test('an error is logged', async () => {
        expect(logger.error.callCount).to.equal(1);
        const [message] = logger.error.lastCall.args;
        expect(message).to.equal('Error importing licence');
      });

      test('a Boom 500 error is returned', async () => {
        expect(response.isBoom).to.equal(true);
        expect(response.output.statusCode).to.equal(500);
      });
    });
  });
});
