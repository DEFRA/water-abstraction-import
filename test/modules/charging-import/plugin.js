'use strict';

const { test, experiment, beforeEach, afterEach } = exports.lab = require('@hapi/lab').script();
const sandbox = require('sinon').createSandbox();
const cron = require('node-cron');

const { plugin } = require('../../../src/modules/charging-import/plugin');
const jobs = require('../../../src/modules/charging-import/jobs');
const chargingImport = require('../../../src/modules/charging-import/lib/import.js');

const { expect } = require('@hapi/code');

experiment('modules/charging-import/plugin.js', () => {
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
  });

  test('has a plugin name', async () => {
    expect(plugin.name).to.equal('importChargingData');
  });

  test('requires pgBoss plugin', async () => {
    expect(plugin.dependencies).to.equal(['pgBoss']);
  });

  experiment('register', () => {
    experiment('on target environments', () => {
      beforeEach(async () => {
        sandbox.stub(process, 'env').value({
          NODE_ENV: 'test'
        });
        await plugin.register(server);
      });

      test('adds subscriber for import charging data job', async () => {
        expect(server.messageQueue.subscribe.calledWith(
          jobs.IMPORT_CHARGING_DATA, chargingImport.importChargingData
        )).to.be.true();
      });

      test('schedules a cron job to run the import 1000 on Mon, Wed and Fri', async () => {
        const [schedule] = cron.schedule.lastCall.args;
        expect(schedule).to.equal('0 10 * * 1,3,5');
      });
    });

    experiment('on production', () => {
      beforeEach(async () => {
        sandbox.stub(process, 'env').value({
          NODE_ENV: 'production'
        });
        plugin.register(server);
      });

      test('subscribers are bound', async () => {
        expect(server.messageQueue.subscribe.callCount).to.equal(1);
      });

      test('cron job is scheduled', async () => {
        expect(cron.schedule.callCount).to.equal(1);
      });
    });
  });
});
