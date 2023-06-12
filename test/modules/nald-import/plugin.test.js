'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Test helpers
const cron = require('node-cron')
const deleteRemovedDocumentsJob = require('../../../src/modules/nald-import/jobs/delete-removed-documents.js')
const importLicenceJob = require('../../../src/modules/nald-import/jobs/import-licence.js')
const populatePendingImportJob = require('../../../src/modules/nald-import/jobs/populate-pending-import.js')
const s3DownloadJob = require('../../../src/modules/nald-import/jobs/s3-download.js')

// Things we need to stub
const config = require('../../../config')
const deleteRemovedDocumentsComplete = require('../../../src/modules/nald-import/jobs/delete-removed-documents-complete.js')
const populatePendingImportComplete = require('../../../src/modules/nald-import/jobs/populate-pending-import-complete.js')
const s3DownloadOnComplete = require('../../../src/modules/nald-import/jobs/s3-download-complete.js')

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

    Sinon.stub(s3DownloadOnComplete, 'handler')
    Sinon.stub(deleteRemovedDocumentsComplete, 'handler')
    Sinon.stub(populatePendingImportComplete, 'handler')
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

      expect(jobName).to.equal(s3DownloadJob.jobName)
      expect(handler).to.equal(s3DownloadJob.handler)
    })

    test('registers s3Download onComplete handler', async () => {
      const completedJob = { id: 'testing' }

      const [jobName, func] = server.messageQueue.onComplete.getCall(0).args
      func(completedJob)

      expect(jobName).to.equal(s3DownloadJob.jobName)
      expect(s3DownloadOnComplete.handler.calledWith(
        server.messageQueue,
        completedJob
      )).to.equal(true)
    })

    test('registers deleteRemovedDocuments job', async () => {
      const [jobName, handler] = server.messageQueue.subscribe.getCall(1).args

      expect(jobName).to.equal(deleteRemovedDocumentsJob.jobName)
      expect(handler).to.equal(deleteRemovedDocumentsJob.handler)
    })

    test('registers deleteRemovedDocuments onComplete handler', async () => {
      const completedJob = { id: 'testing' }

      const [jobName, func] = server.messageQueue.onComplete.getCall(1).args
      func(completedJob)

      expect(jobName).to.equal(deleteRemovedDocumentsJob.jobName)
      expect(deleteRemovedDocumentsComplete.handler.calledWith(
        server.messageQueue
      )).to.equal(true)
    })

    test('registers populatePendingImport job', async () => {
      const [jobName, handler] = server.messageQueue.subscribe.getCall(2).args

      expect(jobName).to.equal(populatePendingImportJob.jobName)
      expect(handler).to.equal(populatePendingImportJob.handler)
    })

    test('registers populatePendingImport onComplete handler', async () => {
      const completedJob = { id: 'testing' }

      const [jobName, func] = server.messageQueue.onComplete.getCall(2).args
      func(completedJob)

      expect(jobName).to.equal(populatePendingImportJob.jobName)
      expect(populatePendingImportComplete.handler.calledWith(
        server.messageQueue,
        completedJob
      )).to.equal(true)
    })

    test('registers importLicence job', async () => {
      const [jobName, options, handler] = server.messageQueue.subscribe.getCall(3).args

      expect(jobName).to.equal(importLicenceJob.jobName)
      expect(options).to.equal(importLicenceJob.options)
      expect(handler).to.equal(importLicenceJob.handler)
    })
  })

  experiment('in production', async () => {
    beforeEach(async () => {
      Sinon.stub(config, 'isProduction').value(true)
      Sinon.stub(process, 'env').value({
        NODE_ENV: 'production'
      })
      await NaldImportPlugin.register(server)
    })

    test('schedules cron job to run at 0100 everyday', async () => {
      const [schedule] = cron.schedule.firstCall.args
      expect(schedule).to.equal('0 1 * * *')
    })
  })

  experiment('in non-production', async () => {
    beforeEach(async () => {
      Sinon.stub(config, 'isProduction').value(false)
      Sinon.stub(process, 'env').value({
        NODE_ENV: 'production'
      })
      await NaldImportPlugin.register(server)
    })

    test('schedules cron job to run every hour', async () => {
      const [schedule] = cron.schedule.firstCall.args
      expect(schedule).to.equal('0 */1 * * *')
    })
  })
})
