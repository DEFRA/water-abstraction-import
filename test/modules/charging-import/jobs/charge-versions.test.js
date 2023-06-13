'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Test helpers
const chargeVersionQueries = require('../../../../src/modules/charging-import/lib/queries/charging')

// Things we need to stub
const queryLoader = require('../../../../src/modules/charging-import/lib/query-loader')

// Thing under test
const ChargeVersionsJob = require('../../../../src/modules/charging-import/jobs/charge-versions.js')

experiment('modules/charging-import/jobs/charge-versions.js', () => {
  beforeEach(async () => {
    Sinon.stub(queryLoader, 'loadQueries')
  })

  afterEach(async () => {
    Sinon.restore()
  })

  experiment('.handler', () => {
    beforeEach(async () => {
      ChargeVersionsJob.handler()
    })

    test('runs the correct queries', async () => {
      expect(queryLoader.loadQueries.calledWith(
        'import.charge-versions',
        [
          chargeVersionQueries.importChargeVersions,
          chargeVersionQueries.importChargeElements,
          chargeVersionQueries.cleanupChargeElements,
          chargeVersionQueries.cleanupChargeVersions
        ]
      )).to.be.true()
    })
  })
})
