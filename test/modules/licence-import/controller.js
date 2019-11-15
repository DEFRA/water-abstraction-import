const { test, experiment, beforeEach, afterEach } = exports.lab = require('lab').script();
const sandbox = require('sinon').createSandbox();
const jobs = require('../../../src/modules/licence-import/jobs');
const controller = require('../../../src/modules/licence-import/controller');
const { logger } = require('../../../src/logger.js');
const { expect } = require('code');

const createRequest = () => ({
  messageQueue: {
    publish: sandbox.stub().resolves()
  }
});

experiment('modules/licence-import/controller.js', () => {
  let request, response;

  beforeEach(async () => {
    sandbox.stub(logger, 'error');
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('when there are no errors', () => {
    beforeEach(async () => {
      request = createRequest();
      response = await controller.postImport(request);
    });

    test('an "import licences" job is published', async () => {
      expect(request.messageQueue.publish.callCount).to.equal(1);
      const [jobType] = request.messageQueue.publish.lastCall.args;
      expect(jobType).to.equal(jobs.IMPORT_LICENCES_JOB);
    });

    test('a success response is returned', async () => {
      expect(response).to.equal({ error: null });
    });
  });

  experiment('when there is an error', () => {
    beforeEach(async () => {
      request = createRequest();
      request.messageQueue.publish.rejects();
      response = await controller.postImport(request);
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
