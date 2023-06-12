'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Thing under test
const S3DownloadComplete = require('../../../../src/modules/nald-import/jobs/s3-download-complete')

const createJob = (isFailed, isRequired) => ({
  failed: isFailed,
  data: {
    request: {
      name: 'nald-import.s3-download'
    },
    response: {
      isRequired
    }
  }
})

experiment('modules/nald-import/jobs/s3-download-import-complete', () => {
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
      const job = createJob(true)

      beforeEach(async () => {
        await S3DownloadComplete.handler(messageQueue, job)
      })

      test('no further jobs are published', async () => {
        expect(messageQueue.publish.called).to.be.false()
      })
    })

    experiment('when the job succeeds', () => {
      experiment('and an import is required', () => {
        const job = createJob(false, true)

        beforeEach(async () => {
          await S3DownloadComplete.handler(messageQueue, job)
        })

        test('a message is logged', async () => {
          const [message] = notifierStub.omg.lastCall.args
          expect(message).to.equal('nald-import.s3-download: finished')
        })

        test('existing import.licence job queue is deleted', async () => {
          expect(messageQueue.deleteQueue.calledWith('nald-import.import-licence')).to.be.true()
        })

        test('existing import.populate-pending-import job queue is deleted', async () => {
          expect(messageQueue.deleteQueue.calledWith('nald-import.populate-pending-import')).to.be.true()
        })

        test('existing nald-import.delete-removed-documents job queue is deleted', async () => {
          expect(messageQueue.deleteQueue.calledWith('nald-import.delete-removed-documents')).to.be.true()
        })

        test('a new job is published to delete any removed documents', async () => {
          const [job] = messageQueue.publish.lastCall.args
          expect(job.name).to.equal('nald-import.delete-removed-documents')
        })
      })

      experiment('and an import is not required', () => {
        const job = createJob(false, false)

        beforeEach(async () => {
          await S3DownloadComplete.handler(messageQueue, job)
        })

        test('a message is logged', async () => {
          const [message] = notifierStub.omg.lastCall.args
          expect(message).to.equal('nald-import.s3-download: finished')
        })

        test('job queues are not deleted', async () => {
          expect(messageQueue.deleteQueue.called).to.be.false()
        })

        test('a new job is not published', async () => {
          expect(messageQueue.publish.called).to.be.false()
        })
      })

      experiment('when publishing a new job fails', () => {
        const err = new Error('oops')

        const job = createJob(false, true)

        beforeEach(async () => {
          messageQueue.publish.rejects(err)
        })

        test('an error thrown', async () => {
          const func = () => S3DownloadComplete.handler(messageQueue, job)
          const error = await expect(func()).to.reject()

          expect(error).to.equal(err)
        })
      })
    })
  })
})
