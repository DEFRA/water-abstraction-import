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
const DeleteDocumentsJob = require('../../../../src/modules/licence-import/jobs/delete-documents.js')

experiment('modules/licence-import/jobs/delete-removed-documents', () => {
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
      const message = DeleteDocumentsJob.createMessage()

      expect(message).to.equal({
        name: 'import.delete-documents',
        options: {
          singletonKey: 'import.delete-documents',
          expireIn: '1 hours'
        }
      })
    })
  })

  experiment('.handler', () => {
    experiment('when the job is successful', () => {
      test('a message is logged', async () => {
        await DeleteDocumentsJob.handler()

        const [message] = notifierStub.omg.lastCall.args

        expect(message).to.equal('import.delete-documents: started')
      })

      test('deletes the removed documents', async () => {
        await DeleteDocumentsJob.handler()

        expect(documentsConnector.deleteRemovedDocuments.called).to.equal(true)
      })
    })

    experiment('when the job fails', () => {
      const err = new Error('Oops!')

      beforeEach(async () => {
        documentsConnector.deleteRemovedDocuments.throws(err)
      })

      test('logs an error message', async () => {
        await expect(DeleteDocumentsJob.handler()).to.reject()

        expect(notifierStub.omfg.calledWith(
          'import.delete-documents: errored', err
        )).to.equal(true)
      })

      test('rethrows the error', async () => {
        const err = await expect(DeleteDocumentsJob.handler()).to.reject()

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
        await DeleteDocumentsJob.onComplete(messageQueue, job)

        const [message] = notifierStub.omg.lastCall.args

        expect(message).to.equal('import.delete-documents: finished')
      })

      test('the import purpose condition types job is published to the queue', async () => {
        await DeleteDocumentsJob.onComplete(messageQueue, job)

        const jobMessage = messageQueue.publish.lastCall.args[0]

        expect(jobMessage.name).to.equal('import.purpose-condition-types')
      })

      experiment('but an error is thrown', () => {
        const err = new Error('oops')

        beforeEach(async () => {
          messageQueue.publish.rejects(err)
        })

        test('rethrows the error', async () => {
          const error = await expect(DeleteDocumentsJob.onComplete(messageQueue, job)).to.reject()

          expect(error).to.equal(error)
        })
      })
    })

    experiment('when the job fails', () => {
      beforeEach(async () => {
        job = { failed: true }
      })

      test('no further jobs are published', async () => {
        await DeleteDocumentsJob.onComplete(messageQueue, job)

        expect(messageQueue.publish.called).to.be.false()
      })
    })
  })
})
