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
const { plugin } = require('../../../src/modules/core/plugin');
const job = require('../../../src/modules/core/jobs/import-tracker');

experiment('modules/core/plugin', () => {
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
  });

  afterEach(async () => {
    sandbox.restore();
  });

  test('plugin has a name', async () => {
    expect(plugin.name).to.equal('importTracker');
  });

  experiment('when the plugin is registered', async () => {
    beforeEach(async () => {
      sandbox.stub(config, 'isProduction').value(false);
      await plugin.register(server);
    });

    test('registers the job', async () => {
      const [jobName, options, handler] = server.messageQueue.subscribe.getCall(0).args;

      expect(jobName).to.equal(job.jobName);
      expect(options).to.equal({});
      expect(handler).to.equal(job.handler);
    });
  });

  experiment('in production', async () => {
    beforeEach(async () => {
      sandbox.stub(config, 'isProduction').value(true);
      sandbox.stub(process, 'env').value({
        NODE_ENV: 'production'
      });
      await plugin.register(server);
    });

    test('schedules cron job to run at 10am every week day', async () => {
      const [schedule] = cron.schedule.firstCall.args;
      expect(schedule).to.equal('0 10 * * 1,2,3,4,5');
    });
  });

  experiment('in non-production', async () => {
    beforeEach(async () => {
      sandbox.stub(config, 'isProduction').value(false);
      sandbox.stub(process, 'env').value({
        NODE_ENV: 'test'
      });
      await plugin.register(server);
    });

    test('schedules cron job to run 3pm every week day', async () => {
      const [schedule] = cron.schedule.firstCall.args;
      expect(schedule).to.equal('0 15 * * 1,2,3,4,5');
    });
  });
});
