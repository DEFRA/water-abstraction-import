'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Things we need to stub
const importService = require('../../../../src/lib/services/import')

// Thing under test
const DeleteRemovedDocumentsJob = require('../../../../src/modules/nald-import/jobs/delete-removed-documents')

experiment('NALD Import: Delete Removed Documents job', () => {
  let notifierStub

  beforeEach(async () => {
    Sinon.stub(importService, 'deleteRemovedDocuments').resolves()

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
      const message = DeleteRemovedDocumentsJob.createMessage()

      expect(message).to.equal({
        name: 'nald-import.delete-removed-documents',
        options: {
          expireIn: '1 hours',
          singletonKey: 'nald-import.delete-removed-documents'
        }
      })
    })
  })

  experiment('.handler', () => {
    experiment('when the job is successful', () => {
      test('a message is logged', async () => {
        await DeleteRemovedDocumentsJob.handler()

        const [message] = notifierStub.omg.lastCall.args

        expect(message).to.equal('nald-import.delete-removed-documents: started')
      })

      test('deletes the removed documents', async () => {
        await DeleteRemovedDocumentsJob.handler()

        expect(importService.deleteRemovedDocuments.called).to.equal(true)
      })
    })

    experiment('when the job fails', () => {
      const err = new Error('Oops!')

      beforeEach(async () => {
        importService.deleteRemovedDocuments.throws(err)
      })

      test('logs an error message', async () => {
        await expect(DeleteRemovedDocumentsJob.handler()).to.reject()

        expect(notifierStub.omfg.calledWith(
          'nald-import.delete-removed-documents: errored', err
        )).to.equal(true)
      })

      test('rethrows the error', async () => {
        const err = await expect(DeleteRemovedDocumentsJob.handler()).to.reject()

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
        await DeleteRemovedDocumentsJob.onComplete(messageQueue, job)

        const [message] = notifierStub.omg.lastCall.args

        expect(message).to.equal('nald-import.delete-removed-documents: finished')
      })

      test('the populate pending imports job is published to the queue', async () => {
        await DeleteRemovedDocumentsJob.onComplete(messageQueue, job)

        const jobMessage = messageQueue.publish.lastCall.args[0]

        expect(jobMessage.name).to.equal('nald-import.queue-licences')
      })

      experiment('but an error is thrown', () => {
        const err = new Error('oops')

        beforeEach(async () => {
          messageQueue.publish.rejects(err)
        })

        test('rethrows the error', async () => {
          const error = await expect(DeleteRemovedDocumentsJob.onComplete(messageQueue, job)).to.reject()

          expect(error).to.equal(error)
        })
      })
    })

    experiment('when the job fails', () => {
      beforeEach(async () => {
        job = { failed: true }
      })

      test('no further jobs are published', async () => {
        await DeleteRemovedDocumentsJob.onComplete(messageQueue, job)

        expect(messageQueue.publish.called).to.be.false()
      })
    })
  })
})
