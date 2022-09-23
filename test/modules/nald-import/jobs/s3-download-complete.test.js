const { afterEach, beforeEach, experiment, test } = exports.lab = require('@hapi/lab').script()
const { expect } = require('@hapi/code')
const sandbox = require('sinon').createSandbox()

const { logger } = require('../../../../src/logger')
const s3DownloadComplete = require('../../../../src/modules/nald-import/jobs/s3-download-complete')

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

  beforeEach(async () => {
    sandbox.stub(logger, 'info')
    sandbox.stub(logger, 'error')

    messageQueue = {
      publish: sandbox.stub(),
      deleteQueue: sandbox.stub()
    }
  })

  afterEach(async () => {
    sandbox.restore()
  })

  experiment('.handler', () => {
    experiment('when the job fails', () => {
      const job = createJob(true)

      beforeEach(async () => {
        await s3DownloadComplete(job, messageQueue)
      })

      test('a message is logged', async () => {
        const [message] = logger.error.lastCall.args
        expect(message).to.equal('Job: nald-import.s3-download failed, aborting')
      })

      test('no further jobs are published', async () => {
        expect(messageQueue.publish.called).to.be.false()
      })
    })

    experiment('when the job succeeds', () => {
      experiment('and an import is required', () => {
        const job = createJob(false, true)

        beforeEach(async () => {
          await s3DownloadComplete(job, messageQueue)
        })

        test('a message is logged', async () => {
          const [message] = logger.info.lastCall.args
          expect(message).to.equal('Handling onComplete job: nald-import.s3-download')
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
          await s3DownloadComplete(job, messageQueue)
        })

        test('a message is logged', async () => {
          const [message] = logger.info.lastCall.args
          expect(message).to.equal('Aborting onComplete job: nald-import.s3-download')
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

        test('an error message is logged and rethrown', async () => {
          const func = () => s3DownloadComplete(job, messageQueue)
          await expect(func()).to.reject()

          const [message, error] = logger.error.lastCall.args
          expect(message).to.equal('Error handling onComplete job: nald-import.s3-download')
          expect(error).to.equal(err)
        })
      })
    })
  })
})
