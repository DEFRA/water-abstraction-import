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
  beforeEach(async () => {
    Sinon.stub(queryLoader, 'loadQueries')
  })

  afterEach(async () => {
    Sinon.restore()
  })

  experiment('.handler', () => {
    beforeEach(async () => {
      await ChargingDataJob.handler()
    })

    test('runs the correct queries', async () => {
      expect(queryLoader.loadQueries.calledWith(
        'import.charging-data',
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
  })
})
