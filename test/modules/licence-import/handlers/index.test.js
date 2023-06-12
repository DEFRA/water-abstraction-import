'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach, fail } = exports.lab = Lab.script()
const { expect } = Code

// Things we need to stub
const extract = require('../../../../src/modules/licence-import/extract')
const importCompanies = require('../../../../src/modules/licence-import/connectors/import-companies')
const load = require('../../../../src/modules/licence-import/load')
const purposeConditionTypesConnector = require('../../../../src/modules/licence-import/connectors/purpose-conditions-types')
const transform = require('../../../../src/modules/licence-import/transform')

// Thing under test
const handlers = require('../../../../src/modules/licence-import/handlers')

experiment('modules/licence-import/transform/handlers', () => {
  let notifierStub
  let server

  beforeEach(async () => {
    server = {
      messageQueue: {
        publish: Sinon.stub().resolves()
      }
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

  experiment('importLicences', () => {
    beforeEach(async () => {
      Sinon.stub(extract, 'getAllLicenceNumbers').resolves([
        { LIC_NO: 'A' },
        { LIC_NO: 'B' }
      ])
    })

    experiment('importLicences', () => {
      let result

      experiment('when there are no errors', () => {
        beforeEach(async () => {
          result = await handlers.importLicences()
        })

        test('an info message is logged', async () => {
          expect(notifierStub.omg.callCount).to.equal(1)
        })

        test('list of licences/region codes/parties are loaded', async () => {
          expect(extract.getAllLicenceNumbers.callCount).to.equal(1)
        })

        test('the job resolves with the list of licences', async () => {
          expect(result).to.equal([
            { LIC_NO: 'A' },
            { LIC_NO: 'B' }
          ])
        })
      })

      experiment('when there is an error', () => {
        beforeEach(async () => {
          extract.getAllLicenceNumbers.throws()
        })

        test('error is logged and re-thrown', async () => {
          try {
            await handlers.importLicences()
            fail()
          } catch (err) {
            expect(notifierStub.omfg.callCount).to.equal(1)
            expect(notifierStub.omfg.lastCall.args[0]).to.equal('import.licences: errored')
          }
        })
      })
    })
  })

  experiment('onComplete importLicences', () => {
    const job = {
      data: {
        request: {
          name: 'test-name'
        },
        response: {
          value: [
            { LIC_NO: 'A' },
            { LIC_NO: 'B' }
          ]
        }
      }
    }

    experiment('when there are no errors', () => {
      beforeEach(async () => {
        await handlers.onCompleteImportLicences(server.messageQueue, job)
      })

      test('an info message is logged', async () => {
        expect(notifierStub.omg.calledWith('import.companies: finished')).to.be.true()
      })

      test('2 import jobs are published', async () => {
        expect(server.messageQueue.publish.callCount).to.equal(2)
      })

      test('an import licence job is published for the first licence', async () => {
        const [message] = server.messageQueue.publish.firstCall.args
        expect(message.name).to.equal('import.licence')
        expect(message.data.licenceNumber).to.equal('A')
      })

      test('an import licence job is published for the second licence', async () => {
        const [message] = server.messageQueue.publish.secondCall.args
        expect(message.name).to.equal('import.licence')
        expect(message.data.licenceNumber).to.equal('B')
      })
    })

    experiment('when there are errors', () => {
      beforeEach(async () => {
        server.messageQueue.publish.rejects()
      })

      test('an error is thrown', async () => {
        const func = () => handlers.onCompleteImportLicences(server.messageQueue, job)
        await expect(func()).to.reject()
      })
    })
  })

  experiment('importLicence', () => {
    const jobData = { data: { licenceNumber: 'A' } }

    beforeEach(async () => {
      Sinon.stub(extract, 'getLicenceData').resolves({
        foo: 'bar'
      })
      Sinon.stub(transform.licence, 'transformLicence').returns({
        bar: 'foo'
      })
      Sinon.stub(load.licence, 'loadLicence')
    })

    experiment('when there are no errors', () => {
      beforeEach(async () => {
        await handlers.importLicence(jobData)
      })

      test('an info message is NOT logged', async () => {
        expect(notifierStub.omg.callCount).to.equal(0)
      })

      test('extract.getLicenceData is called', async () => {
        expect(extract.getLicenceData.calledWith(jobData.data.licenceNumber)).to.be.true()
      })

      test('raw licence data is transformed', async () => {
        expect(transform.licence.transformLicence.calledWith({ foo: 'bar' })).to.be.true()
      })

      test('transformed licence data is stored', async () => {
        expect(load.licence.loadLicence.calledWith({ bar: 'foo' })).to.be.true()
      })
    })

    experiment('when there is an error', () => {
      beforeEach(async () => {
        extract.getLicenceData.rejects()
      })

      test('error is logged and re-thrown', async () => {
        try {
          await handlers.importLicence()
          fail()
        } catch (err) {
          expect(notifierStub.omfg.callCount).to.equal(1)
          expect(notifierStub.omfg.lastCall.args[0]).to.equal('import.licence: errored')
        }
      })
    })
  })

  experiment('importCompany', () => {
    const jobData = { data: { regionCode: '1', partyId: '101' } }

    beforeEach(async () => {
      Sinon.stub(extract, 'getCompanyData').resolves({
        foo: 'bar'
      })
      Sinon.stub(transform.company, 'transformCompany').returns({
        bar: 'foo'
      })
      Sinon.stub(load.company, 'loadCompany')
      Sinon.stub(importCompanies, 'setImportedStatus')
    })

    experiment('when there are no errors', () => {
      beforeEach(async () => {
        await handlers.importCompany(jobData)
      })

      test('an info message is NOT logged', async () => {
        expect(notifierStub.omg.callCount).to.equal(0)
      })

      test('extract.getCompanyData is called', async () => {
        expect(extract.getCompanyData.calledWith(
          jobData.data.regionCode, jobData.data.partyId
        )).to.be.true()
      })

      test('raw company data is transformed', async () => {
        expect(transform.company.transformCompany.calledWith({ foo: 'bar' })).to.be.true()
      })

      test('transformed company data is stored', async () => {
        expect(load.company.loadCompany.calledWith({ bar: 'foo' })).to.be.true()
      })
    })

    experiment('when there is an error', () => {
      beforeEach(async () => {
        extract.getCompanyData.rejects()
      })

      test('error is logged and re-thrown', async () => {
        try {
          await handlers.importCompany()
          fail()
        } catch (err) {
          expect(notifierStub.omfg.callCount).to.equal(1)
          expect(notifierStub.omfg.lastCall.args[0]).to.equal('import.company: errored')
        }
      })
    })
  })

  experiment('importCompanies', () => {
    let result

    beforeEach(async () => {
      Sinon.stub(importCompanies, 'clear')
    })

    experiment('when there are no errors', () => {
      beforeEach(async () => {
        Sinon.stub(importCompanies, 'initialise').resolves([
          {
            region_code: 1,
            party_id: 123
          }
        ])
        result = await handlers.importCompanies()
      })

      test('logs an info message', async () => {
        expect(notifierStub.omg.calledWith('import.companies: started')).to.be.true()
      })

      test('clears existing import_companies table data', async () => {
        expect(importCompanies.clear.called).to.be.true()
      })

      test('initialises the import_companies table with new data', async () => {
        expect(importCompanies.initialise.called).to.be.true()
      })

      test('resolves with mapped list of region codes/party IDs', async () => {
        expect(result).to.equal([{
          regionCode: 1,
          partyId: 123
        }])
      })
    })

    experiment('when there are errors', () => {
      beforeEach(async () => {
        Sinon.stub(importCompanies, 'initialise').rejects()
      })

      test('an error is logged and re-thrown', async () => {
        try {
          await handlers.importCompanies()
          fail()
        } catch (err) {
          expect(notifierStub.omfg.called).to.be.true()
        }
      })
    })
  })

  experiment('onComplete importCompanies', () => {
    let messageQueue

    beforeEach(async () => {
      messageQueue = {
        publish: Sinon.stub()
      }
      const job = {
        data: {
          response: {
            value: [{
              regionCode: 1,
              partyId: 123
            }]
          }
        }
      }
      await handlers.onCompleteImportCompanies(messageQueue, job)
    })

    test('a job is published to import each company', async () => {
      const [{ name, data }] = messageQueue.publish.lastCall.args
      expect(name).to.equal('import.company')
      expect(data).to.equal({
        regionCode: 1, partyId: 123
      })
    })
  })

  experiment('onComplete importCompany', () => {
    let messageQueue

    beforeEach(async () => {
      Sinon.stub(importCompanies, 'getPendingCount')
      messageQueue = {
        deleteQueue: Sinon.stub(),
        publish: Sinon.stub()
      }
    })

    experiment('when there are still companies to import', () => {
      beforeEach(async () => {
        importCompanies.getPendingCount.resolves(5)
        await handlers.onCompleteImportCompany(messageQueue)
      })

      test('the queue is not deleted', async () => {
        expect(messageQueue.deleteQueue.called).to.be.false()
      })

      test('the import licences job is not published', async () => {
        expect(messageQueue.publish.called).to.be.false()
      })
    })

    experiment('when all the companies are imported', () => {
      beforeEach(async () => {
        importCompanies.getPendingCount.resolves(0)
        await handlers.onCompleteImportCompany(messageQueue)
      })

      test('the queue is deleted', async () => {
        expect(messageQueue.deleteQueue.called).to.be.true()
      })

      test('the import licences job is published', async () => {
        const [{ name }] = messageQueue.publish.lastCall.args
        expect(name).to.equal('import.licences')
      })
    })
  })

  experiment('importPurposeConditionTypes', () => {
    beforeEach(async () => {
      Sinon.stub(purposeConditionTypesConnector, 'createPurposeConditionTypes').resolves()
      await handlers.importPurposeConditionTypes()
    })

    test('logs an info message', async () => {
      expect(notifierStub.omg.calledWith('import.purpose-condition-types: started')).to.be.true()
    })

    test('calls the right connector method', async () => {
      expect(purposeConditionTypesConnector.createPurposeConditionTypes.called).to.be.true()
    })

    experiment('when there are errors', () => {
      test('an error is logged and re-thrown', async () => {
        const err = new Error('test error')
        purposeConditionTypesConnector.createPurposeConditionTypes.throws(err)
        try {
          await handlers.importPurposeConditionTypes()
        } catch (err) {
          expect(notifierStub.omfg.called).to.be.true()
        }
      })
    })
  })
  experiment('onComplete importPurposeConditionTypes', () => {
    let messageQueue

    beforeEach(async () => {
      messageQueue = {
        publish: Sinon.stub()
      }
    })

    test('the next job is published', async () => {
      await handlers.onCompleteImportPurposeConditionTypes(messageQueue)
      expect(messageQueue.publish.called).to.be.true()
    })
  })
})
