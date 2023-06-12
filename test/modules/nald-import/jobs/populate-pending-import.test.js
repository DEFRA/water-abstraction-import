'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Things we need to stub
const importService = require('../../../../src/lib/services/import')
const assertImportTablesExist = require('../../../../src/modules/nald-import/lib/assert-import-tables-exist')

// Thing under test
const populatePendingImport = require('../../../../src/modules/nald-import/jobs/populate-pending-import')

experiment('modules/nald-import/jobs/populate-pending-import', () => {
  let notifierStub

  beforeEach(async () => {
    Sinon.stub(assertImportTablesExist, 'assertImportTablesExist')
    Sinon.stub(importService, 'getLicenceNumbers').resolves([
      'licence-1-id',
      'licence-2-id'
    ])

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
      const job = populatePendingImport.createMessage()
      expect(job).to.equal({
        name: 'nald-import.populate-pending-import',
        options: {
          expireIn: '1 hours',
          singletonKey: 'nald-import.populate-pending-import'
        }
      })
    })
  })

  experiment('.handler', () => {
    let result

    experiment('when the job is successful', () => {
      const job = {
        name: 'nald-import.populate-pending-import'
      }

      beforeEach(async () => {
        result = await populatePendingImport.handler(job)
      })

      test('a message is logged', async () => {
        const [message] = notifierStub.omg.lastCall.args
        expect(message).to.equal('nald-import.populate-pending-import: started')
      })

      test('asserts that the import tables exist', async () => {
        expect(assertImportTablesExist.assertImportTablesExist.called).to.be.true()
      })

      test('retrieves the licence numbers', async () => {
        expect(importService.getLicenceNumbers.called).to.be.true()
      })

      test('resolves with an array of licence numbers to import', async () => {
        expect(result).to.equal({
          licenceNumbers: [
            'licence-1-id',
            'licence-2-id'
          ]
        })
      })
    })

    experiment('when the job fails', () => {
      const err = new Error('Oops!')

      const job = {
        name: 'nald-import.populate-pending-import'
      }

      beforeEach(async () => {
        assertImportTablesExist.assertImportTablesExist.throws(err)
      })

      test('logs an error message', async () => {
        const func = () => populatePendingImport.handler(job)
        await expect(func()).to.reject()
        expect(notifierStub.omfg.calledWith(
          'nald-import.populate-pending-import: errored', err
        )).to.be.true()
      })

      test('rethrows the error', async () => {
        const func = () => populatePendingImport.handler(job)
        const err = await expect(func()).to.reject()
        expect(err.message).to.equal('Oops!')
      })
    })
  })
})
