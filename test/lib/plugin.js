'use strict';

const {
  experiment,
  test,
  beforeEach,
  afterEach
} = exports.lab = require('@hapi/lab').script();

const { expect } = require('@hapi/code');
const sandbox = require('sinon').createSandbox();

const plugin = require('../../src/lib/plugin');

experiment('lib/plugin', () => {
  experiment('createRegister', () => {
    let registerSubscribers;
    let server;

    beforeEach(async () => {
      registerSubscribers = sandbox.spy();
      server = Symbol('test server');
    });

    afterEach(async () => {
      sandbox.restore();
    });

    experiment('when in the travis environment', () => {
      test('registerSubscribers is not called', async () => {
        sandbox.stub(process, 'env').value({
          TRAVIS: 1
        });
        plugin.createRegister(server, registerSubscribers);
        expect(registerSubscribers.called).to.equal(false);
      });
    });

    experiment('when not in the travis environment', () => {
      const registerEnvironments = ['local', 'dev', 'test', 'preprod', 'production'];

      registerEnvironments.forEach(env => {
        test(`registerSubscribers is called for ${env}`, async () => {
          sandbox.stub(process, 'env').value({ NODE_ENV: env });
          plugin.createRegister(server, registerSubscribers);

          expect(registerSubscribers.called).to.equal(true);
        });
      });
    });
  });
});
