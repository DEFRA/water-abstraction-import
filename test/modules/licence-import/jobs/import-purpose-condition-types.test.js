'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Things we need to stub
const purposeConditionsConnector = require('../../../../src/modules/licence-import/connectors/purpose-conditions-types.js')

// Thing under test
const ImportPurposeConditionTypesJob = require('../../../../src/modules/licence-import/jobs/import-purpose-condition-types.js')

experiment('Licence Import: Import Purpose Condition Types job', () => {
  let notifierStub

  beforeEach(async () => {
    Sinon.stub(purposeConditionsConnector, 'createPurposeConditionTypes').resolves()

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
      const message = ImportPurposeConditionTypesJob.createMessage()

      expect(message).to.equal({
        name: 'licence-import.import-purpose-condition-types',
        options: {
          singletonKey: 'licence-import.import-purpose-condition-types',
          expireIn: '1 hours'
        }
      })
    })
  })

  experiment('.handler', () => {
    experiment('when the job is successful', () => {
      test('a message is logged', async () => {
        await ImportPurposeConditionTypesJob.handler()

        const [message] = notifierStub.omg.lastCall.args

        expect(message).to.equal('licence-import.import-purpose-condition-types: started')
      })

      test('creates the purpose condition types', async () => {
        await ImportPurposeConditionTypesJob.handler()

        expect(purposeConditionsConnector.createPurposeConditionTypes.called).to.equal(true)
      })
    })

    experiment('when the job fails', () => {
      const err = new Error('Oops!')

      beforeEach(async () => {
        purposeConditionsConnector.createPurposeConditionTypes.throws(err)
      })

      test('logs an error message', async () => {
        await expect(ImportPurposeConditionTypesJob.handler()).to.reject()

        expect(notifierStub.omfg.calledWith(
          'licence-import.import-purpose-condition-types: errored', err
        )).to.equal(true)
      })

      test('rethrows the error', async () => {
        const err = await expect(ImportPurposeConditionTypesJob.handler()).to.reject()

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
        job = { failed: false }
      })

      test('a message is logged', async () => {
        await ImportPurposeConditionTypesJob.onComplete(messageQueue, job)

        const [message] = notifierStub.omg.lastCall.args

        expect(message).to.equal('licence-import.import-purpose-condition-types: finished')
      })

      test('the import companies job is published to the queue', async () => {
        await ImportPurposeConditionTypesJob.onComplete(messageQueue, job)

        const jobMessage = messageQueue.publish.lastCall.args[0]

        expect(jobMessage.name).to.equal('licence-import.queue-companies')
      })

      experiment('but an error is thrown', () => {
        const err = new Error('oops')

        beforeEach(async () => {
          messageQueue.publish.rejects(err)
        })

        test('rethrows the error', async () => {
          const error = await expect(ImportPurposeConditionTypesJob.onComplete(messageQueue, job)).to.reject()

          expect(error).to.equal(error)
        })
      })
    })

    experiment('when the job fails', () => {
      beforeEach(async () => {
        job = { failed: true }
      })

      test('no further jobs are published', async () => {
        await ImportPurposeConditionTypesJob.onComplete(messageQueue, job)

        expect(messageQueue.publish.called).to.be.false()
      })
    })
  })
})
