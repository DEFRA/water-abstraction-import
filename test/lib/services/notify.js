'use strict';

const {
  experiment,
  test,
  beforeEach,
  afterEach
} = exports.lab = require('@hapi/lab').script();

const { expect } = require('@hapi/code');
const sandbox = require('sinon').createSandbox();

const notifyConnector = require('../../../src/lib/connectors/notify');
const notifyService = require('../../../src/lib/services/notify');

experiment('lib/services/notify', () => {
  const notifyClient = {
    sendEmail: sandbox.stub()
  };
  beforeEach(async () => {
    sandbox.stub(notifyConnector, 'getClient').returns(notifyClient);
    sandbox.stub(notifyConnector, '_getKey');
    await notifyService.sendEmail('test@email.com', 'service_status_alert', { test: 'data' });
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('.sendNotifyMessage', () => {
    test('calls the notify connector with the right params', async () => {
      const [templateId, recipient, data] = notifyClient.sendEmail.lastCall.args;
      expect(templateId).to.equal('c34d1b16-694b-4364-8e7e-83e9dbd34a62');
      expect(recipient).to.equal('test@email.com');
      expect(data).to.equal({ personalisation: { test: 'data' } });
    });
  });
});
