'use strict';

const {
  experiment,
  test,
  beforeEach,
  afterEach
} = exports.lab = require('@hapi/lab').script();

const { expect } = require('@hapi/code');
const sandbox = require('sinon').createSandbox();

const notifyConnector = require('../../../src/lib/connectors/water/notify');
const notifyService = require('../../../src/lib/services/notify');

experiment('lib/services/notify', () => {
  beforeEach(async () => {
    sandbox.stub(notifyConnector, 'postSendMessage');
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('.sendNotifyMessage', () => {
    test('calls the notify connector with the right params', async () => {
      notifyConnector.postSendMessage.resolves({});
      await notifyService.sendNotifyMessage('test-ref', { test: 'data' });
      const [messageRef, data] = notifyConnector.postSendMessage.lastCall.args;
      expect(messageRef).to.equal('test-ref');
      expect(data).to.equal({ test: 'data' });
    });
  });
});
