const { test, experiment, beforeEach, afterEach } = exports.lab = require('lab').script();
const { expect } = require('code');
const { pool } = require('../../src/lib/connectors/db');
const { plugin } = require('../../src/plugins/pg-boss');
const sandbox = require('sinon').createSandbox();
const PgBoss = require('pg-boss');

experiment('plugins/pg-boss.js', () => {
  let server;

  beforeEach(async () => {
    sandbox.stub(pool, 'query').resolves({
      rows: []
    });
    server = {
      decorate: sandbox.stub()
    };
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('plugin', () => {
    beforeEach(async () => {
      await plugin.register(server);
    });

    test('has a plugin name of pgBoss', async () => {
      expect(plugin.name).to.equal('pgBoss');
    });

    test('registering the server decorates it with PG Boss instance', async () => {
      const { args } = server.decorate.firstCall;
      expect(args[0]).to.equal('server');
      expect(args[1]).to.equal('messageQueue');
      expect(args[2] instanceof PgBoss).to.be.true();
    });

    test('registering the server decorates the request with PG Boss instance', async () => {
      const { args } = server.decorate.secondCall;
      expect(args[0]).to.equal('request');
      expect(args[1]).to.equal('messageQueue');
      expect(args[2] instanceof PgBoss).to.be.true();
    });
  });
});
