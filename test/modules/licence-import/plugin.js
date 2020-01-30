const { test, experiment, beforeEach, afterEach } = exports.lab = require('@hapi/lab').script();
const sandbox = require('sinon').createSandbox();
const cron = require('node-cron');
const { plugin } = require('../../../src/modules/licence-import/plugin');
const jobs = require('../../../src/modules/licence-import/jobs');
const handlers = require('../../../src/modules/licence-import/handlers');

const { expect } = require('@hapi/code');

experiment('modules/licence-import/plugin.js', () => {
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
    expect(plugin.name).to.equal('importSchedule');
  });

  experiment('register', () => {
    experiment('on target environments', () => {
      const options = { teamSize: 1000, teamConcurrency: 5 };

      beforeEach(async () => {
        process.env.NODE_ENV = 'test';
        await plugin.register(server);
      });

      test('adds subscriber for import companies job', async () => {
        expect(server.messageQueue.subscribe.calledWith(
          jobs.IMPORT_COMPANIES_JOB, handlers.importCompanies
        )).to.be.true();
      });

      test('adds on complete handler for import companies job', async () => {
        const [job, func] = server.messageQueue.onComplete.firstCall.args;
        expect(job).to.equal(jobs.IMPORT_COMPANIES_JOB);
        expect(func).to.be.a.function();
      });

      test('adds subscriber for import company job', async () => {
        expect(server.messageQueue.subscribe.calledWith(
          jobs.IMPORT_COMPANY_JOB, options, handlers.importCompany
        )).to.be.true();
      });

      test('adds on complete handler for import company job', async () => {
        const [job, func] = server.messageQueue.onComplete.secondCall.args;
        expect(job).to.equal(jobs.IMPORT_COMPANY_JOB);
        expect(func).to.be.a.function();
      });

      test('adds subscriber for import licences job', async () => {
        expect(server.messageQueue.subscribe.calledWith(
          jobs.IMPORT_LICENCES_JOB, handlers.importLicences
        )).to.be.true();
      });

      test('adds subscriber for import licence job', async () => {
        expect(server.messageQueue.subscribe.calledWith(
          jobs.IMPORT_LICENCE_JOB, options, handlers.importLicence
        )).to.be.true();
      });

      test('schedules a cron job to run the import', async () => {
        expect(cron.schedule.calledWith(
          '0 0 4 1/1 * * *'
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
