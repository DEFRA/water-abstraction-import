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

experiment('modules/nald-import/jobs/delete-removed-documents', () => {
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
      const job = DeleteRemovedDocumentsJob.createMessage()
      expect(job).to.equal({
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
      const job = {
        name: 'nald-import.delete-removed-documents'
      }

      beforeEach(async () => {
        await DeleteRemovedDocumentsJob.handler(job)
      })

      test('a message is logged', async () => {
        const [message] = notifierStub.omg.lastCall.args
        expect(message).to.equal('nald-import.delete-removed-documents: started')
      })

      test('deletes the removed documents', async () => {
        expect(importService.deleteRemovedDocuments.called).to.equal(true)
      })
    })

    experiment('when the job fails', () => {
      const err = new Error('Oops!')

      const job = {
        name: 'nald-import.delete-removed-documents'
      }

      beforeEach(async () => {
        importService.deleteRemovedDocuments.throws(err)
      })

      test('logs an error message', async () => {
        const func = () => DeleteRemovedDocumentsJob.handler(job)
        await expect(func()).to.reject()
        expect(notifierStub.omfg.calledWith(
          'nald-import.delete-removed-documents: errored', err
        )).to.equal(true)
      })

      test('rethrows the error', async () => {
        const func = () => DeleteRemovedDocumentsJob.handler(job)
        const err = await expect(func()).to.reject()
        expect(err.message).to.equal('Oops!')
      })
    })
  })
})
