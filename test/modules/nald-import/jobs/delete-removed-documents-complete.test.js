'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Thing under test
const DeleteRemovedDocumentsCompleteJob = require('../../../../src/modules/nald-import/jobs/delete-removed-documents-complete')

experiment('modules/nald-import/jobs/delete-removed-documents-complete', () => {
  let job
  let messageQueue
  let notifierStub

  beforeEach(async () => {
    messageQueue = {
      publish: Sinon.stub(),
      deleteQueue: Sinon.stub()
    }

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

  experiment('.handler', () => {
    experiment('when the job fails', () => {
      beforeEach(async () => {
        job = { failed: true }

        await DeleteRemovedDocumentsCompleteJob.handler(messageQueue, job)
      })

      test('no further jobs are published', async () => {
        expect(messageQueue.publish.called).to.be.false()
      })
    })

    experiment('when the job succeeds', () => {
      beforeEach(async () => {
        job = { failed: false }

        await DeleteRemovedDocumentsCompleteJob.handler(messageQueue, job)
      })

      test('a message is logged', async () => {
        const [message] = notifierStub.omg.lastCall.args
        expect(message).to.equal('nald-import.delete-removed-documents: finished')
      })

      test('a new job is published to populate the pending imports table', async () => {
        const [job] = messageQueue.publish.lastCall.args
        expect(job.name).to.equal('nald-import.populate-pending-import')
      })

      experiment('when publishing a new job fails', () => {
        const err = new Error('oops')

        beforeEach(async () => {
          messageQueue.publish.rejects(err)
        })

        test('an error thrown', async () => {
          const func = () => DeleteRemovedDocumentsCompleteJob.handler(messageQueue, job)
          const error = await expect(func()).to.reject()

          expect(error).to.equal(error)
        })
      })
    })
  })
})
