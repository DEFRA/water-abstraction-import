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
      const allEnvironments = ['local', 'dev', 'test', 'preprod', 'production'];

      allEnvironments.forEach(env => {
        test(`registerSubscribers is not called for ${env}`, async () => {
          sandbox.stub(process, 'env').value({
            TRAVIS: 1,
            NODE_ENV: env
          });
          plugin.createRegister(server, registerSubscribers);

          expect(registerSubscribers.called).to.equal(false);
        });
      });
    });

    experiment('when not in the travis environment', () => {
      const registerEnvironments = ['local', 'dev', 'test', 'preprod'];

      registerEnvironments.forEach(env => {
        test(`registerSubscribers is called for ${env}`, async () => {
          sandbox.stub(process, 'env').value({ NODE_ENV: env });
          plugin.createRegister(server, registerSubscribers);

          expect(registerSubscribers.called).to.equal(true);
        });
      });

      test('registerSubscribers is not called for production', async () => {
        sandbox.stub(process, 'env').value({ NODE_ENV: 'production' });
        plugin.createRegister(server, registerSubscribers);

        expect(registerSubscribers.called).to.equal(false);
      });
    });
  });
});
