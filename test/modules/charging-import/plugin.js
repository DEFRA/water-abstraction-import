const { test, experiment, beforeEach, afterEach } = exports.lab = require('@hapi/lab').script();
const sandbox = require('sinon').createSandbox();
const cron = require('node-cron');
const { plugin } = require('../../../src/modules/charging-import/plugin');
const jobs = require('../../../src/modules/charging-import/jobs');
const chargingImport = require('../../../src/modules/charging-import/lib/import.js');

const { expect } = require('@hapi/code');

experiment('modules/charging-import/plugin.js', () => {
  const originalEnv = process.env.NODE_ENV;
  let server;

  beforeEach(async () => {
    server = {
      messageQueue: {
        subscribe: sandbox.stub().resolves(),
        publish: sandbox.stub().resolves(),
        onComplete: sandbox.stub().resolves()
      }
    };
    sandbox.stub(cron, 'schedule');
  });

  afterEach(async () => {
    sandbox.restore();
    process.env.NODE_ENV = originalEnv;
  });

  test('has a plugin name', async () => {
    expect(plugin.name).to.equal('importChargingData');
  });

  experiment('register', () => {
    experiment('on target environments', () => {
      const options = { teamSize: 1000, teamConcurrency: 5 };

      beforeEach(async () => {
        process.env.NODE_ENV = 'test';
        await plugin.register(server);
      });

      test('adds subscriber for import charging data job', async () => {
        expect(server.messageQueue.subscribe.calledWith(
          jobs.IMPORT_CHARGING_DATA, chargingImport.importChargingData
        )).to.be.true();
      });

      test('schedules a cron job to run the import every other day at 3:00pm', async () => {
        expect(cron.schedule.calledWith(
          '0 15 */2 * *'
        )).to.be.true();
      });
    });

    experiment('on production', () => {
      beforeEach(async () => {
        process.env.NODE_ENV = 'production';
        plugin.register(server);
      });

      test('subscribers are not bound', async () => {
        expect(server.messageQueue.subscribe.callCount).to.equal(0);
      });

      test('cron job is not scheduled', async () => {
        expect(cron.schedule.callCount).to.equal(0);
      });
    });
  });
});
