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
    experiment('when the job succeeds', () => {
      test('a message is logged', async () => {
        await TriggerEndDateProcessJob.onComplete()

        const [message] = notifierStub.omg.lastCall.args

        expect(message).to.equal('licence-import.trigger-end-date-process: finished')
      })
    })
  })
})
