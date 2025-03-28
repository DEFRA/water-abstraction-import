'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = (exports.lab = Lab.script())
const { expect } = Code

// Things we need to stub
const db = require('../../../../src/lib/connectors/db.js')

// Thing under test
const PersistReturns = require('../../../../src/modules/licence-returns-import/lib/persist-returns.js')

experiment('modules/licence-returns-import/lib/persist-returns', () => {
  const naldReturn = {
    return_id: 'v1:123:456',
    regime: 'water',
    licence_type: 'abstraction',
    licence_ref: '01/234/567',
    start_date: '2016-11-01',
    end_date: '2017-10-31',
    returns_frequency: 'month',
    status: 'completed',
    source: 'NALD',
    metadata: JSON.stringify({ param: 'value', version: '1' }),
    received_date: '2017-11-24',
    return_requirement: '012345',
    due_date: '2017-11-28'
  }

  afterEach(() => {
    Sinon.restore()
  })

  experiment('when a return log does not exist', () => {
    beforeEach(() => {
      Sinon.stub(db, 'query')
        .onFirstCall().resolves([{ return_log_exists: false, return_submission_exists: true }])
        .onSecondCall().resolves([{ return_cycle_id: '40eb9d9e-0cad-4794-b7eb-dfc7ccaf8b26' }])
        .onThirdCall().resolves()
    })

    test('creates the return log', async () => {
      await PersistReturns.go([naldReturn], false)

      const params = db.query.thirdCall.args[1]

      // Confirm all the params required were passed to the query
      expect(params).to.equal([
        '2017-11-28',
        '2017-10-31',
        '01/234/567',
        'abstraction',
        JSON.stringify({ param: 'value', version: '1' }),
        '2017-11-24',
        'water',
        'v1:123:456',
        '012345',
        'month',
        'NALD',
        '2016-11-01',
        'completed',
        '40eb9d9e-0cad-4794-b7eb-dfc7ccaf8b26'
      ])
    })
  })

  experiment('when the return already exists', () => {
    beforeEach(async () => {
      Sinon.stub(db, 'query')
        .onFirstCall().resolves([{ return_log_exists: true, return_submission_exists: true }])
        .onSecondCall().resolves()
    })

    test("updates the return log's 'due_date', 'metadata', 'received_date', 'returns_frequency', and 'status'", async () => {
      await PersistReturns.go([naldReturn], false)

      const params = db.query.secondCall.args[1]

      // Confirm all the params required were passed to the query
      expect(params).to.equal([
        '2017-11-28',
        '{"param":"value","version":"1"}',
        '2017-11-24',
        'month',
        'completed',
        'v1:123:456'
      ])
    })
  })
})
