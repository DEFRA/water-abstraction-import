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
const s3Download = require('../../../../src/modules/nald-import/jobs/s3-download')

experiment('modules/nald-import/jobs/s3-download', () => {
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
      const job = s3Download.createMessage()
      expect(job).to.equal({
        name: 'nald-import.s3-download',
        options: {
          expireIn: '1 hours',
          singletonKey: 'nald-import.s3-download'
        },
        data: {
          checkEtag: true
        }
      })
    })
  })

  experiment('.handler', () => {
    let result
    let job

    experiment('when there is no import state stored', () => {
      beforeEach(async () => {
        applicationStateService.get.resolves({})

        job = s3Download.createMessage()
        result = await s3Download.handler(job)
      })

      test('the handler resolves with the expected values', async () => {
        expect(result).to.equal({
          etag: 'test-etag',
          state: {},
          isRequired: true
        })
      })

      test('a message is logged', async () => {
        const [message] = notifierStub.omg.lastCall.args
        expect(message).to.equal('nald-import.s3-download: started')
      })

      test('updates the application state with the new etag', async () => {
        expect(applicationStateService.save.firstCall.args).to.equal(['nald-import', { etag: 'test-etag', isDownloaded: false }])
      })

      test('downloads and extracts from S3 bucket', async () => {
        expect(extractService.downloadAndExtract.called).to.be.true()
      })

      test('updates the application state when file imported', async () => {
        expect(applicationStateService.save.secondCall.args).to.equal(['nald-import', { etag: 'test-etag', isDownloaded: true }])
      })
    })

    experiment('when the import state indicates download did not complete', () => {
      beforeEach(async () => {
        applicationStateService.get.resolves({
          etag: 'test-etag',
          isDownloaded: false
        })

        job = s3Download.createMessage()
        result = await s3Download.handler(job)
      })

      test('the handler resolves with the expected values', async () => {
        expect(result).to.equal({
          etag: 'test-etag',
          state: { etag: 'test-etag', isDownloaded: false },
          isRequired: true
        })
      })

      test('a message is logged', async () => {
        const [message] = notifierStub.omg.lastCall.args
        expect(message).to.equal('nald-import.s3-download: started')
      })

      test('updates the application state with the new etag', async () => {
        expect(applicationStateService.save.firstCall.args).to.equal(['nald-import', { etag: 'test-etag', isDownloaded: false }])
      })

      test('downloads and extracts from S3 bucket', async () => {
        expect(extractService.downloadAndExtract.called).to.be.true()
      })

      test('updates the application state when file imported', async () => {
        expect(applicationStateService.save.secondCall.args).to.equal(['nald-import', { etag: 'test-etag', isDownloaded: true }])
      })
    })

    experiment('when the import state indicates etag has changed', () => {
      beforeEach(async () => {
        applicationStateService.get.resolves({
          etag: 'some-old-etag',
          isDownloaded: true
        })

        job = s3Download.createMessage()
        result = await s3Download.handler(job)
      })

      test('the handler resolves with the expected values', async () => {
        expect(result).to.equal({
          etag: 'test-etag',
          state: { etag: 'some-old-etag', isDownloaded: true },
          isRequired: true
        })
      })

      test('a message is logged', async () => {
        const [message] = notifierStub.omg.lastCall.args
        expect(message).to.equal('nald-import.s3-download: started')
      })

      test('updates the application state with the new etag', async () => {
        expect(applicationStateService.save.firstCall.args).to.equal(['nald-import', { etag: 'test-etag', isDownloaded: false }])
      })

      test('downloads and extracts from S3 bucket', async () => {
        expect(extractService.downloadAndExtract.called).to.be.true()
      })

      test('updates the application state when file imported', async () => {
        expect(applicationStateService.save.secondCall.args).to.equal(['nald-import', { etag: 'test-etag', isDownloaded: true }])
      })
    })

    experiment('when the import state indicates etag has not changed', () => {
      beforeEach(async () => {
        applicationStateService.get.resolves({
          etag: 'test-etag',
          isDownloaded: true
        })

        job = s3Download.createMessage()
        result = await s3Download.handler(job)
      })

      test('the application state is not updated', async () => {
        expect(applicationStateService.save.called).to.be.false()
      })

      test('the file is not imported from S3', async () => {
        expect(extractService.downloadAndExtract.called).to.be.false()
      })

      test('the handler resolves with the expected values', async () => {
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

        job = s3Download.createMessage(false)
        result = await s3Download.handler(job)
      })

      test('the handler resolves with the expected values', async () => {
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

        job = s3Download.createMessage()
      })

      test('logs an error message', async () => {
        const func = () => s3Download.handler(job)
        await expect(func()).to.reject()
        expect(notifierStub.omfg.calledWith(
          'nald-import.s3-download: errored', err
        )).to.be.true()
      })

      test('rethrows the error', async () => {
        const func = () => s3Download.handler(job)
        const err = await expect(func()).to.reject()
        expect(err.message).to.equal('Oops!')
      })
    })
  })
})
