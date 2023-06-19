'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Test helpers
const purposesQueries = require('../../../../src/modules/charging-import/lib/queries/purposes')
const returnVersionQueries = require('../../../../src/modules/charging-import/lib/queries/return-versions')
const financialAgreementTypeQueries = require('../../../../src/modules/charging-import/lib/queries/financial-agreement-types')

// Things we need to stub
const queryLoader = require('../../../../src/modules/charging-import/lib/query-loader')

// Thing under test
const ChargingDataJob = require('../../../../src/modules/charging-import/jobs/charging-data.js')

experiment('modules/charging-import/jobs/charging-data.js', () => {
  let notifierStub

  beforeEach(async () => {
    Sinon.stub(queryLoader, 'loadQueries')

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
        await ChargingDataJob.handler()

        expect(notifierStub.omg.calledWith('import.charging-data: started')).to.be.true()
      })

      test('runs the correct queries', async () => {
        await ChargingDataJob.handler()

        expect(queryLoader.loadQueries.calledWith(
          [
            financialAgreementTypeQueries.importFinancialAgreementTypes,
            purposesQueries.importPrimaryPurposes,
            purposesQueries.importSecondaryPurposes,
            purposesQueries.importUses,
            purposesQueries.importValidPurposeCombinations,
            returnVersionQueries.importReturnVersions,
            returnVersionQueries.importReturnRequirements,
            returnVersionQueries.importReturnRequirementPurposes
          ]
        )).to.be.true()
      })

      test('logs a finished message', async () => {
        await ChargingDataJob.handler()

        expect(notifierStub.omg.calledWith('import.charging-data: finished')).to.be.true()
      })
    })

    experiment('when the job fails', () => {
      const err = new Error('oops!')

      beforeEach(async () => {
        queryLoader.loadQueries.rejects(err)
      })

      test('throws the error', async () => {
        const result = await expect(ChargingDataJob.handler()).to.reject()

        expect(result).to.be.an.error()
        expect(result.message).to.equal('oops!')
      })

      test('logs the error', async () => {
        await expect(ChargingDataJob.handler()).to.reject()

        expect(notifierStub.omfg.calledWith('import.charging-data: errored', err)).to.be.true()
      })
    })
  })
})
