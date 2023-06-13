'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Things we need to stub
const config = require('../../../../config')
const jobsConnector = require('../../../../src/lib/connectors/water-import/jobs')
const notifyService = require('../../../../src/lib/services/notify')

// Thing under test
const importTrackerJob = require('../../../../src/modules/core/jobs/import-tracker')

experiment('modules/core/jobs/import-tracker', () => {
  const jobName = 'import.tracker'

  let notifierStub

  beforeEach(async () => {
    Sinon.stub(jobsConnector, 'getFailedJobs')
    Sinon.stub(notifyService, 'sendEmail')

    // RequestLib depends on the GlobalNotifier to have been set. This happens in app/plugins/global-notifier.plugin.js
    // when the app starts up and the plugin is registered. As we're not creating an instance of Hapi server in this
    // test we recreate the condition by setting it directly with our own stub
    notifierStub = { omg: Sinon.stub(), omfg: Sinon.stub() }
    global.GlobalNotifier = notifierStub
  })

  afterEach(async () => {
    Sinon.restore()
    delete global.GlobalNotifier
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
      let testMessage = 'There is 1 failed import job in the prd environment.\n\nJob Name: Test.Job.Name \nTotal Errors: 100 \nDate created: 2001-01-01 \nDate completed: 2001-01-01\n\n'
      beforeEach(async () => {
        Sinon.stub(config, 'environment').value('prd')
        Sinon.stub(config, 'isProduction').value(true)
        Sinon.stub(process, 'env').value({
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

      test('the handler post the correct message to notify', async () => {
        const [recipient, templateRef, data] = notifyService.sendEmail.lastCall.args
        expect(recipient).to.equal('test-mailbox@test.com')
        expect(templateRef).to.equal('service_status_alert')
        expect(data).to.equal({ content: testMessage })
      })

      test('when there are 2 failed job the sub title is pluralised', async () => {
        testMessage = 'There are 2 failed import jobs in the prd environment.' +
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

    experiment('when there are NO jobs that have failed', () => {
      beforeEach(async () => {
        jobsConnector.getFailedJobs.resolves([])
        await importTrackerJob.handler(job)
      })

      test('the handler post the correct message to notify', async () => {
        expect(notifyService.sendEmail.calledOnce).to.be.false()
      })
    })
  })
})
