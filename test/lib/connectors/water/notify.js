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

experiment('lib/connectors/water/notify', () => {
  beforeEach(async () => {
    sandbox.stub(serviceRequest, 'post');
    sandbox.stub(config.services, 'water').value('http://example.com');
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('.postSendMessage', () => {
    test('makes a request to the expected url', async () => {
      await connector.postSendMessage('test-ref', { data: 'test-data' });
      const [url, body] = serviceRequest.post.lastCall.args;

      expect(url).to.equal('http://example.com/notify/test-ref');
      expect(body).to.equal({ body: { data: 'test-data' } });
    });

    test('returns the data', async () => {
      serviceRequest.post.resolves({
        body: { data: 'test-data' }
      });
      const request = await connector.postSendMessage('test-ref', { data: 'test-data' });
      expect(request.body).to.equal({ data: 'test-data' });
    });
  });
});
