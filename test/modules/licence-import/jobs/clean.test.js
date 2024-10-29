'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Things we need to stub
const documentsConnector = require('../../../../src/modules/licence-import/connectors/documents.js')

// Thing under test
const CleanJob = require('../../../../src/modules/licence-import/jobs/clean.js')

experiment('Licence Import: Clean', () => {
  let notifierStub

  beforeEach(async () => {
    Sinon.stub(documentsConnector, 'deleteRemovedDocuments').resolves()

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
      const message = CleanJob.createMessage()

      expect(message).to.equal({
        name: 'licence-import.clean',
        options: {
          singletonKey: 'licence-import.clean',
          expireIn: '1 hours'
        }
      })
    })
  })

  experiment('.handler', () => {
    experiment('when the job is successful', () => {
      test('a message is logged', async () => {
        await CleanJob.handler()

        const [message] = notifierStub.omg.lastCall.args

        expect(message).to.equal('licence-import.clean: started')
      })

      test('deletes the removed documents', async () => {
        await CleanJob.handler()

        expect(documentsConnector.deleteRemovedDocuments.called).to.equal(true)
      })
    })

    experiment('when the job fails', () => {
      const err = new Error('Oops!')

      beforeEach(async () => {
        documentsConnector.deleteRemovedDocuments.throws(err)
      })

      test('logs an error message', async () => {
        await expect(CleanJob.handler()).to.reject()

        expect(notifierStub.omfg.calledWith(
          'licence-import.clean: errored', err
        )).to.equal(true)
      })

      test('rethrows the error', async () => {
        const err = await expect(CleanJob.handler()).to.reject()

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
        await CleanJob.onComplete(messageQueue, job)

        const [message] = notifierStub.omg.lastCall.args

        expect(message).to.equal('licence-import.clean: finished')
      })

      test('the import purpose condition types job is published to the queue', async () => {
        await CleanJob.onComplete(messageQueue, job)

        const jobMessage = messageQueue.publish.lastCall.args[0]

        expect(jobMessage.name).to.equal('licence-import.import-purpose-condition-types')
      })

      experiment('but an error is thrown', () => {
        const err = new Error('oops')

        beforeEach(async () => {
          messageQueue.publish.rejects(err)
        })

        test('rethrows the error', async () => {
          const error = await expect(CleanJob.onComplete(messageQueue, job)).to.reject()

          expect(error).to.equal(error)
        })
      })
    })

    experiment('when the job fails', () => {
      beforeEach(async () => {
        job = { failed: true }
      })

      test('no further jobs are published', async () => {
        await CleanJob.onComplete(messageQueue, job)

        expect(messageQueue.publish.called).to.be.false()
      })
    })
  })
})
