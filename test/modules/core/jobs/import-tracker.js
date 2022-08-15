'use strict'

const { afterEach, beforeEach, experiment, test } = exports.lab = require('@hapi/lab').script()
const { expect } = require('@hapi/code')
const sandbox = require('sinon').createSandbox()

const { logger } = require('../../../../src/logger')
const jobsConnector = require('../../../../src/lib/connectors/water-import/jobs')
const notifyService = require('../../../../src/lib/services/notify')
const importTrackerJob = require('../../../../src/modules/core/jobs/import-tracker')
const slack = require('../../../../src/lib/slack')

experiment('modules/core/jobs/import-tracker', () => {
  const jobName = 'import.tracker'
  beforeEach(async () => {
    sandbox.stub(logger, 'info')
    sandbox.stub(logger, 'error')
    sandbox.stub(slack, 'post')
    sandbox.stub(jobsConnector, 'getFailedJobs')
    sandbox.stub(notifyService, 'sendEmail')
  })

  afterEach(async () => {
    sandbox.restore()
  })

  experiment('.createMessage', () => {
    test('formats a message for PG boss', async () => {
      const job = importTrackerJob.createMessage()
      expect(job).to.equal({
        name: jobName,
        options: {
          singletonKey: jobName
        }
      })
    })
  })

  experiment('.handler', () => {
    const job = {
      name: jobName
    }

    experiment('when there are jobs that have failed', () => {
      experiment('on the production environment', () => {
        let testMessage = 'There is 1 failed import job in the prd environment.\n\nJob Name: Test.Job.Name \nTotal Errors: 100 \nDate created: 2001-01-01 \nDate completed: 2001-01-01\n\n'
        beforeEach(async () => {
          sandbox.stub(process, 'env').value({
            ENVIRONMENT: 'prd',
            WATER_SERVICE_MAILBOX: 'test-mailbox@test.com'
          })
          jobsConnector.getFailedJobs.resolves([{
            jobName: 'Test.Job.Name',
            total: 100,
            dateCreated: '2001-01-01',
            dateCompleted: '2001-01-01'
          }])
          await importTrackerJob.handler(job)
        })

        test('the handler post the correct message to slack', async () => {
          const result = slack.post.lastCall.args[0]
          expect(result).to.equal(testMessage)
        })
        test('the handler post the correct message to notify', async () => {
          const [recipient, templateRef, data] = notifyService.sendEmail.lastCall.args
          expect(recipient).to.equal('test-mailbox@test.com')
          expect(templateRef).to.equal('service_status_alert')
          expect(data).to.equal({ content: testMessage })
        })
        test('when there are 2 failed job the sub title is pluralised', async () => {
          testMessage = 'There are 2 failed import jobs in the production environment.' +
            '\n\nJob Name: Test.Job.Name 1 \nTotal Errors: 100 \nDate created: 2001-01-01 \nDate completed: 2001-01-01\n\n' +
            'Job Name: Test.Job.Name 2 \nTotal Errors: 100 \nDate created: 2010-01-01 \nDate completed: 2010-01-01\n\n'
          jobsConnector.getFailedJobs.resolves([{
            jobName: 'Test.Job.Name 1',
            total: 100,
            dateCreated: '2001-01-01',
            dateCompleted: '2001-01-01'
          },
          {
            jobName: 'Test.Job.Name 2',
            total: 100,
            dateCreated: '2010-01-01',
            dateCompleted: '2010-01-01'
          }])
          await importTrackerJob.handler(job)
          const [recipient, templateRef, data] = notifyService.sendEmail.lastCall.args
          expect(recipient).to.equal('test-mailbox@test.com')
          expect(templateRef).to.equal('service_status_alert')
          expect(data).to.equal({ content: testMessage })
        })
      })
    })

    experiment('on the preprod environment', () => {
      const testMessage = 'There is 1 failed import job in the pre environment.\n\nJob Name: Test.Job.Name \nTotal Errors: 100 \nDate created: 2001-01-01 \nDate completed: 2001-01-01\n\n'
      beforeEach(async () => {
        sandbox.stub(process, 'env').value({
          ENVIRONMENT: 'pre',
          WATER_SERVICE_MAILBOX: 'test-mailbox@test.com'
        })
        jobsConnector.getFailedJobs.resolves([{
          jobName: 'Test.Job.Name',
          total: 100,
          dateCreated: '2001-01-01',
          dateCompleted: '2001-01-01'
        }])
        await importTrackerJob.handler(job)
      })

      test('the handler post the correct message to slack', async () => {
        const result = slack.post.lastCall.args[0]
        expect(result).to.equal(testMessage)
      })
      test('the handler post the correct message to notify', async () => {
        const [recipient, templateRef, data] = notifyService.sendEmail.lastCall.args
        expect(recipient).to.equal('test-mailbox@test.com')
        expect(templateRef).to.equal('service_status_alert')
        expect(data).to.equal({ content: testMessage })
      })
    })

    experiment('on the test environment', () => {
      const testMessage = 'There is 1 failed import job in the tst environment.\n\nJob Name: Test.Job.Name \nTotal Errors: 100 \nDate created: 2001-01-01 \nDate completed: 2001-01-01\n\n'
      beforeEach(async () => {
        sandbox.stub(process, 'env').value({
          ENVIRONMENT: 'tst'
        })
        jobsConnector.getFailedJobs.resolves([{
          jobName: 'Test.Job.Name',
          total: 100,
          dateCreated: '2001-01-01',
          dateCompleted: '2001-01-01'
        }])
        await importTrackerJob.handler(job)
      })

      test('the handler post the correct message to slack', async () => {
        const result = slack.post.lastCall.args[0]
        expect(result).to.equal(testMessage)
      })
      test('the handler does not post a message to notify', async () => {
        expect(notifyService.sendEmail.calledOnce).to.be.false()
      })
    })

    experiment('when there are NO jobs that have failed', () => {
      beforeEach(async () => {
        jobsConnector.getFailedJobs.resolves([])
        await importTrackerJob.handler(job)
      })

      test('the handler post the correct message to slack', async () => {
        expect(slack.post.calledOnce).to.be.false()
      })
      test('the handler post the correct message to notify', async () => {
        expect(notifyService.sendEmail.calledOnce).to.be.false()
      })
    })
  })
})
