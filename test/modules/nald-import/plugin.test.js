'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Test helpers
const config = require('../../../config')
const DeleteRemovedDocumentsJob = require('../../../src/modules/nald-import/jobs/delete-removed-documents.js')
const ImportLicenceJob = require('../../../src/modules/nald-import/jobs/import-licence.js')
const QueueLicencesJob = require('../../../src/modules/nald-import/jobs/queue-licences.js')
const S3DownloadJob = require('../../../src/modules/nald-import/jobs/s3-download.js')
const TriggerEndDateCheckJob = require('../../../src/modules/nald-import/jobs/trigger-end-date-check.js')

// Things we need to stub
const cron = require('node-cron')

// Thing under test
const NaldImportPlugin = require('../../../src/modules/nald-import/plugin.js')

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
  })

  afterEach(async () => {
    Sinon.restore()
  })

  test('has a plugin name', async () => {
    expect(NaldImportPlugin.plugin.name).to.equal('importNaldData')
  })

  test('requires pgBoss plugin', async () => {
    expect(NaldImportPlugin.plugin.dependencies).to.equal(['pgBoss'])
  })

  experiment('register', () => {
    experiment('for S3 Download', () => {
      test('subscribes its handler to the job queue', async () => {
        await NaldImportPlugin.plugin.register(server)

        const subscribeArgs = server.messageQueue.subscribe.getCall(0).args

        expect(subscribeArgs[0]).to.equal(S3DownloadJob.name)
        expect(subscribeArgs[1]).to.equal(S3DownloadJob.handler)
      })

      test('registers its onComplete for the job', async () => {
        await NaldImportPlugin.plugin.register(server)

        const onCompleteArgs = server.messageQueue.onComplete.getCall(0).args

        expect(onCompleteArgs[0]).to.equal(S3DownloadJob.name)
        expect(onCompleteArgs[1]).to.be.a.function()
      })

      test('schedules the job to be published', async () => {
        await NaldImportPlugin.plugin.register(server)

        expect(cron.schedule.calledWith(config.import.nald.schedule)).to.be.true()
      })
    })

    experiment('for Trigger End Date Check', () => {
      test('subscribes its handler to the job queue', async () => {
        await NaldImportPlugin.plugin.register(server)

        const subscribeArgs = server.messageQueue.subscribe.getCall(1).args

        expect(subscribeArgs[0]).to.equal(TriggerEndDateCheckJob.name)
        expect(subscribeArgs[1]).to.equal(TriggerEndDateCheckJob.handler)
      })

      test('registers its onComplete for the job', async () => {
        await NaldImportPlugin.plugin.register(server)

        const onCompleteArgs = server.messageQueue.onComplete.getCall(1).args

        expect(onCompleteArgs[0]).to.equal(TriggerEndDateCheckJob.name)
        expect(onCompleteArgs[1]).to.be.a.function()
      })

      test('schedules the job to be published', async () => {
        await NaldImportPlugin.plugin.register(server)

        expect(cron.schedule.calledWith(config.import.nald.schedule)).to.be.true()
      })
    })

    experiment('for Delete Removed Documents', () => {
      test('subscribes its handler to the job queue', async () => {
        await NaldImportPlugin.plugin.register(server)

        const subscribeArgs = server.messageQueue.subscribe.getCall(2).args

        expect(subscribeArgs[0]).to.equal(DeleteRemovedDocumentsJob.name)
        expect(subscribeArgs[1]).to.equal(DeleteRemovedDocumentsJob.handler)
      })

      test('registers its onComplete for the job', async () => {
        await NaldImportPlugin.plugin.register(server)

        const onCompleteArgs = server.messageQueue.onComplete.getCall(2).args

        expect(onCompleteArgs[0]).to.equal(DeleteRemovedDocumentsJob.name)
        expect(onCompleteArgs[1]).to.be.a.function()
      })
    })

    experiment('for Queue Licences', () => {
      test('subscribes its handler to the job queue', async () => {
        await NaldImportPlugin.plugin.register(server)

        const subscribeArgs = server.messageQueue.subscribe.getCall(3).args

        expect(subscribeArgs[0]).to.equal(QueueLicencesJob.name)
        expect(subscribeArgs[1]).to.equal(QueueLicencesJob.handler)
      })

      test('registers its onComplete for the job', async () => {
        await NaldImportPlugin.plugin.register(server)

        const onCompleteArgs = server.messageQueue.onComplete.getCall(3).args

        expect(onCompleteArgs[0]).to.equal(QueueLicencesJob.name)
        expect(onCompleteArgs[1]).to.be.a.function()
      })
    })

    experiment('for Import Licence', () => {
      test('subscribes its handler to the job queue', async () => {
        await NaldImportPlugin.plugin.register(server)

        const subscribeArgs = server.messageQueue.subscribe.getCall(4).args

        expect(subscribeArgs[0]).to.equal(ImportLicenceJob.name)
        expect(subscribeArgs[1]).to.equal(ImportLicenceJob.options)
        expect(subscribeArgs[2]).to.equal(ImportLicenceJob.handler)
      })
    })
  })
})
