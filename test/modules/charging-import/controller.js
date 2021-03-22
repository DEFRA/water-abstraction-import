const { test, experiment, beforeEach, afterEach } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');
const controller = require('../../../src/modules/charging-import/controller');
const chargeVersionsJob = require('../../../src/modules/charging-import/jobs/charge-versions');
const sandbox = require('sinon').createSandbox();

experiment('modules/charging-import/controller.js', () => {
  beforeEach(async () => {
    // sandbox.stub(chargingImport, 'importChargingData');
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('postImportChargingData', () => {
    let response, request;

    beforeEach(async () => {
      request = {
        messageQueue: {
          publish: sandbox.stub()
        }
      };
      response = await controller.postImportChargingData(request);
    });

    test('publishes a message to the message queue to begin the import', async () => {
      const [message] = request.messageQueue.publish.lastCall.args;
      expect(message.name).to.equal(chargeVersionsJob.jobName);
    });

    test('resolves with { error : null } HTTP response', async () => {
      expect(response).to.equal({ error: null });
    });
  });
});
