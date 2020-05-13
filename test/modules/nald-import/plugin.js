const {
  experiment,
  test,
  beforeEach,
  afterEach
} = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const cron = require('node-cron');

const config = require('../../../config');
const { plugin } = require('../../../src/modules/nald-import/plugin');
const jobs = require('../../../src/modules/nald-import/jobs');

experiment('modules/nald-import/plugin', () => {
  let server;

  beforeEach(async () => {
    server = {
      messageQueue: {
        publish: sandbox.stub(),
        subscribe: sandbox.stub(),
        onComplete: sandbox.stub()
      }
    };
    sandbox.stub(cron, 'schedule');

    sandbox.stub(jobs.s3Download, 'onCompleteHandler');
    sandbox.stub(jobs.populatePendingImport, 'onCompleteHandler');
  });

  afterEach(async () => {
    sandbox.restore();
  });

  test('plugin has a name', async () => {
    expect(plugin.name).to.equal('importNaldData');
  });

  experiment('when the plugin is registered', async () => {
    beforeEach(async () => {
      sandbox.stub(config, 'isProduction').value(false);
      await plugin.register(server);
    });

    test('registers s3Download job', async () => {
      const [jobName, options, handler] = server.messageQueue.subscribe.firstCall.args;

      expect(jobName).to.equal(jobs.s3Download.job.jobName);
      expect(options).to.equal({});
      expect(handler).to.equal(jobs.s3Download.job.handler);
    });

    test('registers s3Download onComplete handler', async () => {
      const completedJob = { id: 'testing' };

      const [jobName, func] = server.messageQueue.onComplete.firstCall.args;
      func(completedJob);

      expect(jobName).to.equal(jobs.s3Download.job.jobName);
      expect(jobs.s3Download.onCompleteHandler.calledWith(
        completedJob,
        server.messageQueue
      )).to.equal(true);
    });

    test('registers populatePendingImport job', async () => {
      const [jobName, options, handler] = server.messageQueue.subscribe.secondCall.args;

      expect(jobName).to.equal(jobs.populatePendingImport.job.jobName);
      expect(options).to.equal({});
      expect(handler).to.equal(jobs.populatePendingImport.job.handler);
    });

    test('registers populatePendingImport onComplete handler', async () => {
      const completedJob = { id: 'testing' };

      const [jobName, func] = server.messageQueue.onComplete.secondCall.args;
      func(completedJob);

      expect(jobName).to.equal(jobs.populatePendingImport.job.jobName);
      expect(jobs.populatePendingImport.onCompleteHandler.calledWith(
        completedJob,
        server.messageQueue
      )).to.equal(true);
    });

    test('registers importLicence job', async () => {
      const [jobName, options, handler] = server.messageQueue.subscribe.thirdCall.args;

      expect(jobName).to.equal(jobs.importLicence.job.jobName);
      expect(options).to.equal(jobs.importLicence.job.options);
      expect(handler).to.equal(jobs.importLicence.job.handler);
    });
  });

  experiment('in production', async () => {
    beforeEach(async () => {
      sandbox.stub(config, 'isProduction').value(true);
      await plugin.register(server);
    });

    test('schedules cron job to run every hour', async () => {
      const [schedule] = cron.schedule.firstCall.args;
      expect(schedule).to.equal('0 1 * * *');
    });
  });

  experiment('in non-production', async () => {
    beforeEach(async () => {
      sandbox.stub(config, 'isProduction').value(false);
      await plugin.register(server);
    });

    test('schedules cron job to run every hour', async () => {
      const [schedule] = cron.schedule.firstCall.args;
      expect(schedule).to.equal('0 * * * *');
    });
  });
});
