'use strict';

const {
  experiment,
  test,
  beforeEach,
  afterEach
} = exports.lab = require('@hapi/lab').script();

const { expect } = require('@hapi/code');
const sandbox = require('sinon').createSandbox();

const config = require('../../../../config');
const { serviceRequest } = require('@envage/water-abstraction-helpers');
const connector = require('../../../../src/lib/connectors/water/notify');

experiment('lib/connectors/water/application-state', () => {
  beforeEach(async () => {
    sandbox.stub(serviceRequest, 'post');
    sandbox.stub(config.services, 'water').value('http://example.com');
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('.postSendNotify', () => {
    test('makes a request to the expected url', async () => {
      await connector.postSendNotify('test-key', { data: true });
      const [url] = serviceRequest.post.lastCall.args;

      expect(url).to.equal('http://example.com/notify/test-key');
    });

    test('includes the data in the request', async () => {
      await connector.postSendNotify('test-key', { data: true });
      const [, options] = serviceRequest.post.lastCall.args;

      expect(options.body.data).to.equal(true);
    });

    test('returns the data', async () => {
      serviceRequest.post.resolves({
        applicationStateId: 'test-key'
      });

      const response = await connector.postSendNotify('test-key', { data: true });

      expect(response.applicationStateId).to.equal('test-key');
    });
  });
});
