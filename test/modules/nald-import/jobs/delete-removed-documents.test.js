'use strict'

const { afterEach, beforeEach, experiment, test } = exports.lab = require('@hapi/lab').script()
const { expect } = require('@hapi/code')
const sandbox = require('sinon').createSandbox()

const { logger } = require('../../../../src/logger')
const importService = require('../../../../src/lib/services/import')
const deleteRemovedDocumentsJob = require('../../../../src/modules/nald-import/jobs/delete-removed-documents')

experiment('modules/nald-import/jobs/delete-removed-documents', () => {
  beforeEach(async () => {
    sandbox.stub(logger, 'info')
    sandbox.stub(logger, 'error')

    sandbox.stub(importService, 'deleteRemovedDocuments').resolves()
  })

  afterEach(async () => {
    sandbox.restore()
  })

  experiment('.createMessage', () => {
    test('formats a message for PG boss', async () => {
      const job = deleteRemovedDocumentsJob.createMessage()
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
        await deleteRemovedDocumentsJob.handler(job)
      })

      test('a message is logged', async () => {
        const [message] = logger.info.lastCall.args
        expect(message).to.equal('Handling job: nald-import.delete-removed-documents')
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
        const func = () => deleteRemovedDocumentsJob.handler(job)
        await expect(func()).to.reject()
        expect(logger.error.calledWith(
          'Error handling job nald-import.delete-removed-documents', err
        )).to.equal(true)
      })

      test('rethrows the error', async () => {
        const func = () => deleteRemovedDocumentsJob.handler(job)
        const err = await expect(func()).to.reject()
        expect(err.message).to.equal('Oops!')
      })
    })
  })
})
