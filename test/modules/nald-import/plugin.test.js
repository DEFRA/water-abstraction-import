'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Things we need to stub
const config = require('../../../config')
const cron = require('node-cron')
const DeleteRemovedDocumentsJob = require('../../../src/modules/nald-import/jobs/delete-removed-documents.js')
const ImportLicenceJob = require('../../../src/modules/nald-import/jobs/import-licence.js')
const PopulatePendingImportJob = require('../../../src/modules/nald-import/jobs/populate-pending-import.js')
const S3DownloadJob = require('../../../src/modules/nald-import/jobs/s3-download.js')

// Thing under test
const { plugin: NaldImportPlugin } = require('../../../src/modules/nald-import/plugin.js')

experiment('modules/nald-import/plugin', () => {
  let server

  beforeEach(async () => {
    server = {
      messageQueue: {
        publish: Sinon.stub(),
        subscribe: Sinon.stub(),
        onComplete: Sinon.stub()
      }
    }
    Sinon.stub(cron, 'schedule')

    Sinon.stub(S3DownloadJob, 'onComplete')
    Sinon.stub(DeleteRemovedDocumentsJob, 'onComplete')
    Sinon.stub(PopulatePendingImportJob, 'onComplete')
  })

  afterEach(async () => {
    Sinon.restore()
  })

  test('plugin has a name', async () => {
    expect(NaldImportPlugin.name).to.equal('importNaldData')
  })

  experiment('when the plugin is registered', async () => {
    beforeEach(async () => {
      Sinon.stub(config, 'isProduction').value(false)

      await NaldImportPlugin.register(server)
    })

    test('registers s3Download job', async () => {
      const [jobName, handler] = server.messageQueue.subscribe.getCall(0).args

      expect(jobName).to.equal(S3DownloadJob.name)
      expect(handler).to.equal(S3DownloadJob.handler)
    })

    test('registers s3Download job onComplete', async () => {
      const completedJob = { id: 'testing' }

      const [jobName, func] = server.messageQueue.onComplete.getCall(0).args
      func(completedJob)

      expect(jobName).to.equal(S3DownloadJob.name)
      expect(S3DownloadJob.onComplete.calledWith(
        server.messageQueue,
        completedJob
      )).to.equal(true)
    })

    test('registers deleteRemovedDocuments job', async () => {
      const [jobName, handler] = server.messageQueue.subscribe.getCall(1).args

      expect(jobName).to.equal(DeleteRemovedDocumentsJob.name)
      expect(handler).to.equal(DeleteRemovedDocumentsJob.handler)
    })

    test('registers deleteRemovedDocuments job onComplete', async () => {
      const completedJob = { id: 'testing', failed: true }

      const [jobName, func] = server.messageQueue.onComplete.getCall(1).args
      func(completedJob)

      expect(jobName).to.equal(DeleteRemovedDocumentsJob.name)
      expect(DeleteRemovedDocumentsJob.onComplete.calledWith(
        server.messageQueue,
        completedJob
      )).to.equal(true)
    })

    test('registers populatePendingImport job', async () => {
      const [jobName, handler] = server.messageQueue.subscribe.getCall(2).args

      expect(jobName).to.equal(PopulatePendingImportJob.name)
      expect(handler).to.equal(PopulatePendingImportJob.handler)
    })

    test('registers populatePendingImport job onComplete', async () => {
      const completedJob = { id: 'testing' }

      const [jobName, func] = server.messageQueue.onComplete.getCall(2).args
      func(completedJob)

      expect(jobName).to.equal(PopulatePendingImportJob.name)
      expect(PopulatePendingImportJob.onComplete.calledWith(
        server.messageQueue,
        completedJob
      )).to.equal(true)
    })

    test('registers importLicence job', async () => {
      const [jobName, options, handler] = server.messageQueue.subscribe.getCall(3).args

      expect(jobName).to.equal(ImportLicenceJob.name)
      expect(options).to.equal(ImportLicenceJob.options)
      expect(handler).to.equal(ImportLicenceJob.handler)
    })
  })
})
