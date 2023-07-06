'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Test helpers
const config = require('../../../config.js')
const DeleteDocumentsJob = require('../../../src/modules/licence-import/jobs/delete-documents.js')
const ImportCompaniesJob = require('../../../src/modules/licence-import/jobs/import-companies.js')
const ImportCompanyJob = require('../../../src/modules/licence-import/jobs/import-company.js')
const ImportLicencesJob = require('../../../src/modules/licence-import/jobs/import-licences.js')
const ImportLicenceJob = require('../../../src/modules/licence-import/jobs/import-licence.js')
const ImportPurposeConditionTypesJob = require('../../../src/modules/licence-import/jobs/import-purpose-condition-types.js')

// Things we need to stub
const cron = require('node-cron')

// Thing under test
const LicenceImportPlugin = require('../../../src/modules/licence-import/plugin.js')

experiment('modules/licence-import/plugin.js', () => {
  let server

  beforeEach(async () => {
    server = {
      messageQueue: {
        subscribe: Sinon.stub().resolves(),
        publish: Sinon.stub().resolves(),
        onComplete: Sinon.stub().resolves()
      }
    }
    Sinon.stub(cron, 'schedule')
  })

  afterEach(async () => {
    Sinon.restore()
  })

  test('has a plugin name', async () => {
    expect(LicenceImportPlugin.plugin.name).to.equal('importLicenceData')
  })

  test('requires pgBoss plugin', async () => {
    expect(LicenceImportPlugin.plugin.dependencies).to.equal(['pgBoss'])
  })

  experiment('register', () => {
    experiment('for Delete Documents', () => {
      test('subscribes its handler to the job queue', async () => {
        await LicenceImportPlugin.plugin.register(server)

        const subscribeArgs = server.messageQueue.subscribe.getCall(0).args

        expect(subscribeArgs[0]).to.equal(DeleteDocumentsJob.name)
        expect(subscribeArgs[1]).to.equal(DeleteDocumentsJob.handler)
      })

      test('registers its onComplete for the job', async () => {
        await LicenceImportPlugin.plugin.register(server)

        const onCompleteArgs = server.messageQueue.onComplete.getCall(0).args

        expect(onCompleteArgs[0]).to.equal(DeleteDocumentsJob.name)
        expect(onCompleteArgs[1]).to.be.a.function()
      })

      test('schedules the job to be published', async () => {
        await LicenceImportPlugin.plugin.register(server)

        expect(cron.schedule.calledWith(config.import.licences.schedule)).to.be.true()
      })
    })

    experiment('for Import Purpose Condition Types', () => {
      test('subscribes its handler to the job queue', async () => {
        await LicenceImportPlugin.plugin.register(server)

        const subscribeArgs = server.messageQueue.subscribe.getCall(1).args

        expect(subscribeArgs[0]).to.equal(ImportPurposeConditionTypesJob.name)
        expect(subscribeArgs[1]).to.equal(ImportPurposeConditionTypesJob.handler)
      })

      test('registers its onComplete for the job', async () => {
        await LicenceImportPlugin.plugin.register(server)

        const onCompleteArgs = server.messageQueue.onComplete.getCall(1).args

        expect(onCompleteArgs[0]).to.equal(ImportPurposeConditionTypesJob.name)
        expect(onCompleteArgs[1]).to.be.a.function()
      })
    })

    experiment('for Import Companies', () => {
      test('subscribes its handler to the job queue', async () => {
        await LicenceImportPlugin.plugin.register(server)

        const subscribeArgs = server.messageQueue.subscribe.getCall(2).args

        expect(subscribeArgs[0]).to.equal(ImportCompaniesJob.name)
        expect(subscribeArgs[1]).to.equal(ImportCompaniesJob.handler)
      })

      test('registers its onComplete for the job', async () => {
        await LicenceImportPlugin.plugin.register(server)

        const onCompleteArgs = server.messageQueue.onComplete.getCall(2).args

        expect(onCompleteArgs[0]).to.equal(ImportCompaniesJob.name)
        expect(onCompleteArgs[1]).to.be.a.function()
      })
    })

    experiment('for Import Company', () => {
      test('subscribes its handler and options to the job queue', async () => {
        await LicenceImportPlugin.plugin.register(server)

        const subscribeArgs = server.messageQueue.subscribe.getCall(3).args

        expect(subscribeArgs[0]).to.equal(ImportCompanyJob.name)
        expect(subscribeArgs[1]).to.equal(ImportCompanyJob.options)
        expect(subscribeArgs[2]).to.equal(ImportCompanyJob.handler)
      })

      test('registers its onComplete for the job', async () => {
        await LicenceImportPlugin.plugin.register(server)

        const onCompleteArgs = server.messageQueue.onComplete.getCall(3).args

        expect(onCompleteArgs[0]).to.equal(ImportCompanyJob.name)
        expect(onCompleteArgs[1]).to.be.a.function()
      })
    })

    experiment('for Import Licences', () => {
      test('subscribes its handler to the job queue', async () => {
        await LicenceImportPlugin.plugin.register(server)

        const subscribeArgs = server.messageQueue.subscribe.getCall(4).args

        expect(subscribeArgs[0]).to.equal(ImportLicencesJob.name)
        expect(subscribeArgs[1]).to.equal(ImportLicencesJob.handler)
      })

      test('registers its onComplete for the job', async () => {
        await LicenceImportPlugin.plugin.register(server)

        const onCompleteArgs = server.messageQueue.onComplete.getCall(4).args

        expect(onCompleteArgs[0]).to.equal(ImportLicencesJob.name)
        expect(onCompleteArgs[1]).to.be.a.function()
      })
    })

    experiment('for Import Licence', () => {
      test('subscribes its handler and options to the job queue', async () => {
        await LicenceImportPlugin.plugin.register(server)

        const subscribeArgs = server.messageQueue.subscribe.getCall(5).args

        expect(subscribeArgs[0]).to.equal(ImportLicenceJob.name)
        expect(subscribeArgs[1]).to.equal(ImportLicenceJob.options)
        expect(subscribeArgs[2]).to.equal(ImportLicenceJob.handler)
      })
    })
  })
})
