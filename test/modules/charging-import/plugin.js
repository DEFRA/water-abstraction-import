'use strict';

const { test, experiment, beforeEach, afterEach } = exports.lab = require('@hapi/lab').script();
const sandbox = require('sinon').createSandbox();
const cron = require('node-cron');

const { plugin } = require('../../../src/modules/charging-import/plugin');
const jobs = require('../../../src/modules/charging-import/jobs');
const chargingImport = require('../../../src/modules/charging-import/lib/import.js');
const chargeVersionMetadataImport = require('../../../src/modules/charging-import/lib/import-charge-version-metadata.js');

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

      test('adds subscriber for import charge version metadata job', async () => {
        expect(server.messageQueue.subscribe.calledWith(
          jobs.IMPORT_CHARGE_VERSION_METADATA, chargeVersionMetadataImport.importChargeVersionMetadata
        )).to.be.true();
      });

      test('schedules a cron job at 3pm on Mon, Wed and Fri on non-prod environments to run the charging import', async () => {
        const [schedule, func] = cron.schedule.firstCall.args;
        expect(schedule).to.equal('0 15 * * 1,3,5');
        func();
        const [{ name }] = server.messageQueue.publish.lastCall.args;
        expect(name).to.equal('import.charging-data');
      });

      test('schedules a cron job at 2pm on Mon, Wed and Fri on non-prod environments to run the charge version metadata import', async () => {
        const [schedule, func] = cron.schedule.secondCall.args;
        expect(schedule).to.equal('0 14 * * 1,3,5');
        func();
        const [{ name }] = server.messageQueue.publish.lastCall.args;
        expect(name).to.equal('import.charge-version-metadata');
      });
    });

    experiment('on production', () => {
      beforeEach(async () => {
        sandbox.stub(process.env, 'NODE_ENV').value('production');
        await plugin.register(server);
      });

      test('subscribers are bound', async () => {
        expect(server.messageQueue.subscribe.callCount).to.equal(2);
      });

      test('cron jobs are scheduled', async () => {
        expect(cron.schedule.callCount).to.equal(2);
      });
    });
  });
});
