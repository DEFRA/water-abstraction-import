'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Things we need to stub
const WaterSystemService = require('../../../../src/lib/services/water-system-service.js')

// Thing under test
const TriggerEndDateCheckJob = require('../../../../src/modules/nald-import/jobs/trigger-end-date-check.js')

experiment('NALD Import: Trigger End Date Check job', () => {
  let notifierStub

  beforeEach(async () => {
    Sinon.stub(WaterSystemService, 'postLicencesEndDatesCheck').resolves()

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
      const message = TriggerEndDateCheckJob.createMessage()

      expect(message).to.equal({
        name: 'nald-import.trigger-end-date-check',
        options: {
          expireIn: '1 hours',
          singletonKey: 'nald-import.trigger-end-date-check'
        }
      })
    })
  })

  experiment('.handler', () => {
    experiment('when the job is successful', () => {
      test('a message is logged', async () => {
        await TriggerEndDateCheckJob.handler()

        const [message] = notifierStub.omg.lastCall.args

        expect(message).to.equal('nald-import.trigger-end-date-check: started')
      })

      test('triggers the end date checks', async () => {
        await TriggerEndDateCheckJob.handler()

        expect(WaterSystemService.postLicencesEndDatesCheck.called).to.equal(true)
      })
    })

    experiment('when the job fails', () => {
      const err = new Error('Oops!')

      beforeEach(async () => {
        WaterSystemService.postLicencesEndDatesCheck.throws(err)
      })

      test('logs an error message', async () => {
        await expect(TriggerEndDateCheckJob.handler()).to.reject()

        expect(notifierStub.omfg.calledWith(
          'nald-import.trigger-end-date-check: errored', err
        )).to.equal(true)
      })

      test('rethrows the error', async () => {
        const err = await expect(TriggerEndDateCheckJob.handler()).to.reject()

        expect(err.message).to.equal('Oops!')
      })
    })
  })

  experiment('.onComplete', () => {
    let job
    let messageQueue

    beforeEach(async () => {
      messageQueue = {
        publish: Sinon.stub()
      }
    })

    experiment('when the job succeeds', () => {
      beforeEach(async () => {
        job = {
          failed: false,
          data: { request: {} }
        }
      })

      test('a message is logged', async () => {
        await TriggerEndDateCheckJob.onComplete(messageQueue, job)

        const [message] = notifierStub.omg.lastCall.args

        expect(message).to.equal('nald-import.trigger-end-date-check: finished')
      })

      test('the delete removed documents job is published to the queue', async () => {
        await TriggerEndDateCheckJob.onComplete(messageQueue, job)

        const jobMessage = messageQueue.publish.lastCall.args[0]

        expect(jobMessage.name).to.equal('nald-import.delete-removed-documents')
      })

      experiment('but an error is thrown', () => {
        const err = new Error('oops')

        beforeEach(async () => {
          messageQueue.publish.rejects(err)
        })

        test('rethrows the error', async () => {
          const error = await expect(TriggerEndDateCheckJob.onComplete(messageQueue, job)).to.reject()

          expect(error).to.equal(error)
        })
      })
    })

    experiment('when the job fails', () => {
      beforeEach(async () => {
        job = { failed: true }
      })

      test('no further jobs are published', async () => {
        await TriggerEndDateCheckJob.onComplete(messageQueue, job)

        expect(messageQueue.publish.called).to.be.false()
      })
    })
  })
})
