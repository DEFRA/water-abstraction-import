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
const TriggerEndDateProcessJob = require('../../../../src/modules/licence-import/jobs/trigger-end-date-process.js')

experiment('Licence Import: Trigger End Date Process', () => {
  let notifierStub

  beforeEach(async () => {
    Sinon.stub(WaterSystemService, 'postLicencesEndDatesProcess').resolves()

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
      const message = TriggerEndDateProcessJob.createMessage()

      expect(message).to.equal({
        name: 'licence-import.trigger-end-date-process',
        options: {
          expireIn: '1 hours',
          singletonKey: 'licence-import.trigger-end-date-process'
        }
      })
    })
  })

  experiment('.handler', () => {
    experiment('when the job is successful', () => {
      test('a message is logged', async () => {
        await TriggerEndDateProcessJob.handler()

        const [message] = notifierStub.omg.lastCall.args

        expect(message).to.equal('licence-import.trigger-end-date-process: started')
      })

      test('triggers the end date process', async () => {
        await TriggerEndDateProcessJob.handler()

        expect(WaterSystemService.postLicencesEndDatesProcess.called).to.equal(true)
      })
    })

    experiment('when the job fails', () => {
      const err = new Error('Oops!')

      beforeEach(async () => {
        WaterSystemService.postLicencesEndDatesProcess.throws(err)
      })

      test('logs an error message', async () => {
        await expect(TriggerEndDateProcessJob.handler()).to.reject()

        expect(notifierStub.omfg.calledWith(
          'licence-import.trigger-end-date-process: errored', err
        )).to.equal(true)
      })

      test('rethrows the error', async () => {
        const err = await expect(TriggerEndDateProcessJob.handler()).to.reject()

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
          data: { request: { data: { replicateReturns: false } } }
        }
      })

      test('a message is logged', async () => {
        await TriggerEndDateProcessJob.onComplete(messageQueue, job)

        const [message] = notifierStub.omg.lastCall.args

        expect(message).to.equal('licence-import.trigger-end-date-process: finished')
      })

      test('the Import Purpose Condition Types job is published to the queue', async () => {
        await TriggerEndDateProcessJob.onComplete(messageQueue, job)

        const jobMessage = messageQueue.publish.lastCall.args[0]

        expect(jobMessage.name).to.equal('licence-import.import-purpose-condition-types')
      })

      experiment('but an error is thrown', () => {
        const err = new Error('oops')

        beforeEach(async () => {
          messageQueue.publish.rejects(err)
        })

        test('rethrows the error', async () => {
          const error = await expect(TriggerEndDateProcessJob.onComplete(messageQueue, job)).to.reject()

          expect(error).to.equal(error)
        })
      })
    })

    experiment('when the job fails', () => {
      beforeEach(async () => {
        job = { failed: true }
      })

      test('no further jobs are published', async () => {
        await TriggerEndDateProcessJob.onComplete(messageQueue, job)

        expect(messageQueue.publish.called).to.be.false()
      })
    })
  })
})
