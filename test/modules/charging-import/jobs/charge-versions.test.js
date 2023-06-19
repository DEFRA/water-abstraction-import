'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Test helpers
const chargeVersionMetadataImportService = require('../../../../src/modules/charging-import/services/charge-version-metadata-import.js')
const chargeVersionQueries = require('../../../../src/modules/charging-import/lib/queries/charging')
const importService = require('../../../../src/lib/services/import.js')
const transformPermit = require('../../../../src/modules/nald-import/transform-permit.js')

// Things we need to stub
const queryLoader = require('../../../../src/modules/charging-import/lib/query-loader')

// Thing under test
const ChargeVersionsJob = require('../../../../src/modules/charging-import/jobs/charge-versions.js')

experiment('modules/charging-import/jobs/charge-versions.js', () => {
  let notifierStub

  beforeEach(async () => {
    Sinon.stub(chargeVersionMetadataImportService, 'importChargeVersionMetadataForLicence')
    Sinon.stub(importService, 'getLicenceNumbers').resolves(['LIC001'])
    Sinon.stub(queryLoader, 'loadQueries')
    Sinon.stub(transformPermit, 'getLicenceJson').resolves({ LIC_NO: 'LIC001' })

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

  experiment('.handler', () => {
    experiment('when the job is successful', () => {
      test('logs a start message', async () => {
        await ChargeVersionsJob.handler()

        expect(notifierStub.omg.calledWith('import.charge-versions: started')).to.be.true()
      })

      test('runs the correct queries', async () => {
        await ChargeVersionsJob.handler()

        expect(queryLoader.loadQueries.calledWith(
          [
            chargeVersionQueries.importChargeVersions,
            chargeVersionQueries.importChargeElements,
            chargeVersionQueries.cleanupChargeElements,
            chargeVersionQueries.cleanupChargeVersions
          ]
        )).to.be.true()
      })

      test('logs a finished message', async () => {
        await ChargeVersionsJob.handler()

        expect(notifierStub.omg.calledWith('import.charge-versions: finished')).to.be.true()
      })
    })

    experiment('when the job fails', () => {
      const err = new Error('oops!')

      beforeEach(async () => {
        importService.getLicenceNumbers.rejects(err)
      })

      test('throws the error', async () => {
        const result = await expect(ChargeVersionsJob.handler()).to.reject()

        expect(result).to.be.an.error()
        expect(result.message).to.equal('oops!')
      })

      test('logs the error', async () => {
        await expect(ChargeVersionsJob.handler()).to.reject()

        expect(notifierStub.omfg.calledWith('import.charge-versions: errored', err)).to.be.true()
      })
    })
  })
})
