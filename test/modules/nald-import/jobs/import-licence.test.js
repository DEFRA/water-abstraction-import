'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Things we need to stub
const licenceLoader = require('../../../../src/modules/nald-import/load')
const assertImportTablesExist = require('../../../../src/modules/nald-import/lib/assert-import-tables-exist')

// Thing under test
const importLicence = require('../../../../src/modules/nald-import/jobs/import-licence')

experiment('modules/nald-import/jobs/import-licence', () => {
  let notifierStub

  beforeEach(async () => {
    Sinon.stub(licenceLoader, 'load')
    Sinon.stub(assertImportTablesExist, 'assertImportTablesExist')

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

  experiment('.options', () => {
    test('has teamSize set to 75', async () => {
      expect(importLicence.options.teamSize).to.equal(75)
    })

    test('has teamConcurrency set to 1', async () => {
      expect(importLicence.options.teamConcurrency).to.equal(1)
    })
  })

  experiment('.createMessage', () => {
    test('formats a message for PG boss', async () => {
      const job = importLicence.createMessage('test-licence-number')

      expect(job).to.equal({
        data: {
          licenceNumber: 'test-licence-number'
        },
        name: 'nald-import.import-licence',
        options: { singletonKey: 'test-licence-number' }
      })
    })
  })

  experiment('.handler', () => {
    experiment('when the licence import was successful', () => {
      const job = {
        name: 'nald-import.import-licence',
        data: {
          licenceNumber: 'test-licence-number'
        }
      }

      beforeEach(async () => {
        await importLicence.handler(job)
      })

      test('a message is NOT logged', async () => {
        expect(notifierStub.omg.called).to.be.false()
      })

      test('asserts that the import tables exist', async () => {
        expect(assertImportTablesExist.assertImportTablesExist.called).to.be.true()
      })

      test('loads the requested licence', async () => {
        expect(licenceLoader.load.calledWith('test-licence-number')).to.be.true()
      })
    })

    experiment('when the licence import fails', () => {
      const err = new Error('Oops!')

      const job = {
        name: 'nald-import.import-licence',
        data: {
          licenceNumber: 'test-licence-number'
        }
      }

      beforeEach(async () => {
        assertImportTablesExist.assertImportTablesExist.throws(err)
      })

      test('logs an error message', async () => {
        const func = () => importLicence.handler(job)
        await expect(func()).to.reject()
        expect(notifierStub.omfg.calledWith(
          'nald-import.import-licence: errored',
          err
        )).to.be.true()
      })

      test('rethrows the error', async () => {
        const func = () => importLicence.handler(job)
        const err = await expect(func()).to.reject()
        expect(err.message).to.equal('Oops!')
      })
    })
  })
})
