'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Things we need to stub
const extract = require('../../../../src/modules/licence-import/extract/index.js')
const importCompaniesConnector = require('../../../../src/modules/licence-import/connectors/import-companies.js')
const load = require('../../../../src/modules/licence-import/load/index.js')
const transform = require('../../../../src/modules/licence-import/transform/index.js')

// Thing under test
const ImportCompanyJob = require('../../../../src/modules/licence-import/jobs/import-company.js')

experiment('modules/licence-import/jobs/import-company', () => {
  const regionCode = 1
  const partyId = 37760

  let notifierStub

  beforeEach(async () => {
    Sinon.stub(extract, 'getCompanyData').resolves()
    Sinon.stub(transform.company, 'transformCompany')
    Sinon.stub(load.company, 'loadCompany').resolves()
    Sinon.stub(importCompaniesConnector, 'setImportedStatus').resolves()

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
      const message = ImportCompanyJob.createMessage(regionCode, partyId)

      expect(message).to.equal({
        name: 'import.company',
        data: {
          regionCode: 1,
          partyId: 37760
        },
        options: {
          singletonKey: 'import.company.1.37760',
          expireIn: '1 hours'
        }
      })
    })
  })

  experiment('.handler', () => {
    let job

    beforeEach(() => {
      job = { data: { regionCode: '1', partyId: '101' } }
    })

    experiment('when the job is successful', () => {
      test('a message is NOT logged', async () => {
        await ImportCompanyJob.handler(job)

        expect(notifierStub.omg.called).to.be.false()
      })

      test('extracts the company data, transforms it then loads it into the CRM DB', async () => {
        await ImportCompanyJob.handler(job)

        expect(extract.getCompanyData.called).to.equal(true)
        expect(transform.company.transformCompany.called).to.equal(true)
        expect(load.company.loadCompany.called).to.equal(true)
      })

      test('sets the import status of the water.import_company record', async () => {
        await ImportCompanyJob.handler(job)

        expect(importCompaniesConnector.setImportedStatus.called).to.equal(true)
      })
    })

    experiment('when the job fails', () => {
      const err = new Error('Oops!')

      beforeEach(async () => {
        extract.getCompanyData.throws(err)
      })

      test('logs an error message', async () => {
        await expect(ImportCompanyJob.handler(job)).to.reject()

        expect(notifierStub.omfg.calledWith(
          'import.company: errored', err
        )).to.equal(true)
      })

      test('rethrows the error', async () => {
        const err = await expect(ImportCompanyJob.handler(job)).to.reject()

        expect(err.message).to.equal('Oops!')
      })
    })
  })

  experiment('.onComplete', () => {
    let messageQueue

    beforeEach(async () => {
      messageQueue = {
        deleteQueue: Sinon.stub(),
        publish: Sinon.stub()
      }
    })

    experiment('when there are no more jobs (pending count is 0)', () => {
      beforeEach(async () => {
        Sinon.stub(importCompaniesConnector, 'getPendingCount').resolves(0)
      })

      test('a message is logged', async () => {
        await ImportCompanyJob.onComplete(messageQueue)

        const [message] = notifierStub.omg.lastCall.args

        expect(message).to.equal('import.company: finished')
      })

      test("the import 'state completed' queue is deleted", async () => {
        await ImportCompanyJob.onComplete(messageQueue)

        const queueName = messageQueue.deleteQueue.lastCall.args[0]

        expect(queueName).to.equal('__state__completed__import.company')
      })

      test('the import licences job is published to the queue', async () => {
        await ImportCompanyJob.onComplete(messageQueue)

        const jobMessage = messageQueue.publish.lastCall.args[0]

        expect(jobMessage.name).to.equal('import.licences')
      })
    })

    experiment('when there are more jobs', () => {
      beforeEach(async () => {
        Sinon.stub(importCompaniesConnector, 'getPendingCount').resolves(1)
      })

      test('a message is NOT logged', async () => {
        await ImportCompanyJob.onComplete(messageQueue)

        expect(notifierStub.omg.called).to.be.false()
      })

      test("the import 'state completed' queue is NOT deleted", async () => {
        await ImportCompanyJob.onComplete(messageQueue)

        expect(messageQueue.publish.called).to.be.false()
      })

      test('the import licences job is NOT published to the queue', async () => {
        await ImportCompanyJob.onComplete(messageQueue)

        expect(messageQueue.publish.called).to.be.false()
      })
    })
  })
})
