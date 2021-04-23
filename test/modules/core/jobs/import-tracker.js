'use strict';

const { afterEach, beforeEach, experiment, test } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');
const sandbox = require('sinon').createSandbox();

const { logger } = require('../../../../src/logger');
const jobsConnector = require('../../../../src/lib/connectors/water-import/jobs');
const notifyService = require('../../../../src/lib/services/notify');
const importTrackerJob = require('../../../../src/modules/core/jobs/import-tracker');
const slack = require('../../../../src/lib/slack');

experiment('modules/core/jobs/import-tracker', () => {
  const jobName = 'import.tracker';
  beforeEach(async () => {
    sandbox.stub(logger, 'info');
    sandbox.stub(logger, 'error');
    sandbox.stub(slack, 'post');
    sandbox.stub(jobsConnector, 'getFailedJobs');
    sandbox.stub(notifyService, 'sendNotifyMessage');
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('.createMessage', () => {
    test('formats a message for PG boss', async () => {
      const job = importTrackerJob.createMessage();
      expect(job).to.equal({
        name: jobName,
        options: {
          singletonKey: jobName
        }
      });
    });
  });

  experiment('.handler', () => {
    const job = {
      name: jobName
    };

    experiment('when there are jobs that have failed', () => {
      experiment('on the production environment', () => {
        const testMessage = 'WRLS Import summary of failed jobs in the production environment\nJob Name: Test.Job.Name \nTotal Errors: 100 \nDate failed: 2001-01-01\n\n';
        beforeEach(async () => {
          sandbox.stub(process, 'env').value({
            NODE_ENV: 'production',
            WATER_SERVICE_MAILBOX: 'test-mailbox@test.com'
          });
          jobsConnector.getFailedJobs.resolves([{
            jobName: 'Test.Job.Name',
            total: 100,
            dateFailed: '2001-01-01'
          }]);
          await importTrackerJob.handler(job);
        });

        test('the handler post the correct message to slack', async () => {
          const result = slack.post.lastCall.args[0];
          expect(result).to.equal(testMessage);
        });
        test('the handler post the correct message to notify', async () => {
          const [templateRef, data] = notifyService.sendNotifyMessage.lastCall.args;
          console.log(data);
          expect(templateRef).to.equal('service_status_alert');
          expect(data).to.equal({ recipient: 'test-mailbox@test.com', personalisation: { content: testMessage } });
        });
      });
    });

    experiment('on the preprod environment', () => {
      const testMessage = 'WRLS Import summary of failed jobs in the preprod environment\nJob Name: Test.Job.Name \nTotal Errors: 100 \nDate failed: 2001-01-01\n\n';
      beforeEach(async () => {
        sandbox.stub(process, 'env').value({
          NODE_ENV: 'preprod',
          WATER_SERVICE_MAILBOX: 'test-mailbox@test.com'
        });
        jobsConnector.getFailedJobs.resolves([{
          jobName: 'Test.Job.Name',
          total: 100,
          dateFailed: '2001-01-01'
        }]);
        await importTrackerJob.handler(job);
      });

      test('the handler post the correct message to slack', async () => {
        const result = slack.post.lastCall.args[0];
        expect(result).to.equal(testMessage);
      });
      test('the handler post the correct message to notify', async () => {
        const [templateRef, data] = notifyService.sendNotifyMessage.lastCall.args;
        console.log(data);
        expect(templateRef).to.equal('service_status_alert');
        expect(data).to.equal({ recipient: 'test-mailbox@test.com', personalisation: { content: testMessage } });
      });
    });

    experiment('on the test environment', () => {
      const testMessage = 'WRLS Import summary of failed jobs in the test environment\nJob Name: Test.Job.Name \nTotal Errors: 100 \nDate failed: 2001-01-01\n\n';
      beforeEach(async () => {
        sandbox.stub(process, 'env').value({
          NODE_ENV: 'test'
        });
        jobsConnector.getFailedJobs.resolves([{
          jobName: 'Test.Job.Name',
          total: 100,
          dateFailed: '2001-01-01'
        }]);
        await importTrackerJob.handler(job);
      });

      test('the handler post the correct message to slack', async () => {
        const result = slack.post.lastCall.args[0];
        expect(result).to.equal(testMessage);
      });
      test('the handler does not post a message to notify', async () => {
        expect(notifyService.sendNotifyMessage.calledOnce).to.be.false();
      });
    });

    experiment('when there are NO jobs that have failed', () => {
      beforeEach(async () => {
        jobsConnector.getFailedJobs.resolves([]);
        await importTrackerJob.handler(job);
      });

      test('the handler post the correct message to slack', async () => {
        expect(slack.post.calledOnce).to.be.false();
      });
      test('the handler post the correct message to notify', async () => {
        expect(notifyService.sendNotifyMessage.calledOnce).to.be.false();
      });
    });
  });
});
