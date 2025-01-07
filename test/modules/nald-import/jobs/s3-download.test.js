'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Things we need to stub
const applicationStateService = require('../../../../src/lib/services/application-state-service.js')
const extractService = require('../../../../src/modules/nald-import/services/extract-service.js')
const s3Service = require('../../../../src/modules/nald-import/services/s3-service.js')

// Thing under test
const S3DownloadJob = require('../../../../src/modules/nald-import/jobs/s3-download')

experiment('NALD Import: S3 Download job', () => {
  let notifierStub

  beforeEach(async () => {
    Sinon.stub(extractService, 'downloadAndExtract')
    Sinon.stub(applicationStateService, 'get')
    Sinon.stub(applicationStateService, 'save')
    Sinon.stub(s3Service, 'getEtag').resolves('test-etag')

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
      const message = S3DownloadJob.createMessage()

      expect(message).to.equal({
        name: 'nald-import.s3-download',
        options: {
          expireIn: '1 hours',
          singletonKey: 'nald-import.s3-download'
        },
        data: {
          checkEtag: true,
          replicateReturns: false
        }
      })
    })
  })

  experiment('.handler', () => {
    let job

    experiment('when there is no import state stored', () => {
      beforeEach(async () => {
        applicationStateService.get.resolves({})

        job = S3DownloadJob.createMessage()
      })

      test('the handler resolves with the expected values', async () => {
        const result = await S3DownloadJob.handler(job)

        expect(result).to.equal({
          etag: 'test-etag',
          state: {},
          isRequired: true
        })
      })

      test('a message is logged', async () => {
        await S3DownloadJob.handler(job)

        const [message] = notifierStub.omg.lastCall.args

        expect(message).to.equal('nald-import.s3-download: started')
      })

      test('updates the application state with the new etag', async () => {
        await S3DownloadJob.handler(job)

        expect(applicationStateService.save.firstCall.args).to.equal(['nald-import', { etag: 'test-etag', isDownloaded: false }])
      })

      test('downloads and extracts from S3 bucket', async () => {
        await S3DownloadJob.handler(job)

        expect(extractService.downloadAndExtract.called).to.be.true()
      })

      test('updates the application state when file imported', async () => {
        await S3DownloadJob.handler(job)

        expect(applicationStateService.save.secondCall.args).to.equal(['nald-import', { etag: 'test-etag', isDownloaded: true }])
      })
    })

    experiment('when the import state indicates download did not complete', () => {
      beforeEach(async () => {
        applicationStateService.get.resolves({
          etag: 'test-etag',
          isDownloaded: false
        })

        job = S3DownloadJob.createMessage()
      })

      test('the handler resolves with the expected values', async () => {
        const result = await S3DownloadJob.handler(job)

        expect(result).to.equal({
          etag: 'test-etag',
          state: { etag: 'test-etag', isDownloaded: false },
          isRequired: true
        })
      })

      test('a message is logged', async () => {
        await S3DownloadJob.handler(job)

        const [message] = notifierStub.omg.lastCall.args

        expect(message).to.equal('nald-import.s3-download: started')
      })

      test('updates the application state with the new etag', async () => {
        await S3DownloadJob.handler(job)

        expect(applicationStateService.save.firstCall.args).to.equal(['nald-import', { etag: 'test-etag', isDownloaded: false }])
      })

      test('downloads and extracts from S3 bucket', async () => {
        await S3DownloadJob.handler(job)

        expect(extractService.downloadAndExtract.called).to.be.true()
      })

      test('updates the application state when file imported', async () => {
        await S3DownloadJob.handler(job)

        expect(applicationStateService.save.secondCall.args).to.equal(['nald-import', { etag: 'test-etag', isDownloaded: true }])
      })
    })

    experiment('when the import state indicates etag has changed', () => {
      beforeEach(async () => {
        applicationStateService.get.resolves({
          etag: 'some-old-etag',
          isDownloaded: true
        })

        job = S3DownloadJob.createMessage()
      })

      test('the handler resolves with the expected values', async () => {
        const result = await S3DownloadJob.handler(job)

        expect(result).to.equal({
          etag: 'test-etag',
          state: { etag: 'some-old-etag', isDownloaded: true },
          isRequired: true
        })
      })

      test('a message is logged', async () => {
        await S3DownloadJob.handler(job)

        const [message] = notifierStub.omg.lastCall.args

        expect(message).to.equal('nald-import.s3-download: started')
      })

      test('updates the application state with the new etag', async () => {
        await S3DownloadJob.handler(job)

        expect(applicationStateService.save.firstCall.args).to.equal(['nald-import', { etag: 'test-etag', isDownloaded: false }])
      })

      test('downloads and extracts from S3 bucket', async () => {
        await S3DownloadJob.handler(job)

        expect(extractService.downloadAndExtract.called).to.be.true()
      })

      test('updates the application state when file imported', async () => {
        await S3DownloadJob.handler(job)

        expect(applicationStateService.save.secondCall.args).to.equal(['nald-import', { etag: 'test-etag', isDownloaded: true }])
      })
    })

    experiment('when the import state indicates etag has not changed', () => {
      beforeEach(async () => {
        applicationStateService.get.resolves({
          etag: 'test-etag',
          isDownloaded: true
        })

        job = S3DownloadJob.createMessage()
      })

      test('the application state is not updated', async () => {
        await S3DownloadJob.handler(job)

        expect(applicationStateService.save.called).to.be.false()
      })

      test('the file is not imported from S3', async () => {
        await S3DownloadJob.handler(job)

        expect(extractService.downloadAndExtract.called).to.be.false()
      })

      test('the handler resolves with the expected values', async () => {
        const result = await S3DownloadJob.handler(job)

        expect(result).to.equal({
          etag: 'test-etag',
          state: { etag: 'test-etag', isDownloaded: true },
          isRequired: false
        })
      })
    })

    experiment('when the job overrides the etag check and the etag has not changed', () => {
      beforeEach(async () => {
        applicationStateService.get.resolves({
          etag: 'test-etag',
          isDownloaded: true
        })

        job = S3DownloadJob.createMessage(false)
      })

      test('the handler resolves with the expected values', async () => {
        const result = await S3DownloadJob.handler(job)

        expect(result).to.equal({
          etag: 'test-etag',
          state: { etag: 'test-etag', isDownloaded: true },
          isRequired: true
        })
      })
    })

    experiment('when the job fails', () => {
      const err = new Error('Oops!')

      beforeEach(async () => {
        s3Service.getEtag.throws(err)

        job = S3DownloadJob.createMessage()
      })

      test('logs an error message', async () => {
        await expect(S3DownloadJob.handler(job)).to.reject()
        expect(notifierStub.omfg.calledWith(
          'nald-import.s3-download: errored', err
        )).to.be.true()
      })

      test('rethrows the error', async () => {
        const err = await expect(S3DownloadJob.handler(job)).to.reject()
        expect(err.message).to.equal('Oops!')
      })
    })
  })

  experiment('.onComplete', () => {
    let job
    let messageQueue

    beforeEach(async () => {
      messageQueue = {
        publish: Sinon.stub(),
        deleteQueue: Sinon.stub()
      }
    })

    experiment('when the job fails', () => {
      beforeEach(async () => {
        job = {
          failed: true,
          data: {
            response: {
              isRequired: false
            }
          }
        }
      })

      test('no further jobs are published', async () => {
        await S3DownloadJob.onComplete(messageQueue, job)

        expect(messageQueue.publish.called).to.be.false()
      })
    })

    experiment('when the job succeeds', () => {
      experiment('and an import is required', () => {
        beforeEach(async () => {
          job = {
            failed: false,
            data: {
              request: { data: { replicateReturns: false } },
              response: { isRequired: true }
            }
          }
        })

        test('a message is logged', async () => {
          await S3DownloadJob.onComplete(messageQueue, job)

          const [message] = notifierStub.omg.lastCall.args
          expect(message).to.equal('nald-import.s3-download: finished')
        })

        test('the existing job queues are deleted', async () => {
          await S3DownloadJob.onComplete(messageQueue, job)

          expect(messageQueue.deleteQueue.calledWith('nald-import.trigger-end-date-check')).to.be.true()
          expect(messageQueue.deleteQueue.calledWith('nald-import.delete-removed-documents')).to.be.true()
          expect(messageQueue.deleteQueue.calledWith('nald-import.queue-licences')).to.be.true()
          expect(messageQueue.deleteQueue.calledWith('nald-import.import-licence')).to.be.true()
        })

        test('the trigger end date check job is published to the queue', async () => {
          await S3DownloadJob.onComplete(messageQueue, job)

          const jobMessage = messageQueue.publish.lastCall.args[0]

          expect(jobMessage.name).to.equal('nald-import.trigger-end-date-check')
        })

        experiment('but an error is thrown', () => {
          const err = new Error('oops')

          beforeEach(async () => {
            messageQueue.publish.rejects(err)
          })

          test('rethrows the error', async () => {
            const func = () => S3DownloadJob.onComplete(messageQueue, job)
            const error = await expect(func()).to.reject()

            expect(error).to.equal(err)
          })
        })
      })

      experiment('and an import is not required', () => {
        beforeEach(async () => {
          job = {
            failed: false,
            data: {
              request: { data: { replicateReturns: false } },
              response: { isRequired: false }
            }
          }
        })

        test('a message is logged', async () => {
          await S3DownloadJob.onComplete(messageQueue, job)

          const [message] = notifierStub.omg.lastCall.args
          expect(message).to.equal('nald-import.s3-download: finished')
        })

        test('job queues are not deleted', async () => {
          await S3DownloadJob.onComplete(messageQueue, job)

          expect(messageQueue.deleteQueue.called).to.be.false()
        })

        test('a new job is not published', async () => {
          await S3DownloadJob.onComplete(messageQueue, job)

          expect(messageQueue.publish.called).to.be.false()
        })
      })
    })
  })
})
