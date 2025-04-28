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
  const returnCycles = {
    summer: [{
      end_date: '2017-10-31',
      is_summer: true,
      return_cycle_id: '2fc23cfc-6287-49ab-af8c-6c8215504722',
      start_date: '2016-11-01'
    }],
    winter: []
  }

  const naldReturn = {
    due_date: '2017-11-28',
    end_date: '2017-10-31',
    licence_ref: '01/234/567',
    licence_type: 'abstraction',
    metadata: JSON.stringify({ isSummer: true, param: 'value', version: '1' }),
    received_date: '2017-11-24',
    regime: 'water',
    return_id: 'v1:123:456',
    return_requirement: '012345',
    returns_frequency: 'month',
    sent_date: '2017-11-01',
    source: 'NALD',
    start_date: '2016-11-01',
    status: 'completed'
  }

  afterEach(() => {
    Sinon.restore()
  })

  experiment('when a return log does not exist', () => {
    beforeEach(() => {
      Sinon.stub(db, 'query')
        .onFirstCall().resolves([{ return_log_exists: false, return_submission_exists: true }])
        .onSecondCall().resolves()
    })

    test('creates the return log', async () => {
      await PersistReturns.go([naldReturn], false, returnCycles)

      const params = db.query.secondCall.args[1]

      // Confirm all the params required were passed to the query
      expect(params).to.equal([
        '2017-11-28',
        '2017-10-31',
        '01/234/567',
        'abstraction',
        JSON.stringify({ isSummer: true, param: 'value', version: '1' }),
        '2017-11-24',
        'water',
        '2fc23cfc-6287-49ab-af8c-6c8215504722',
        'v1:123:456',
        '012345',
        'month',
        '2017-11-01',
        'NALD',
        '2016-11-01',
        'completed'
      ])
    })
  })

  experiment('when the return already exists', () => {
    beforeEach(async () => {
      Sinon.stub(db, 'query')
        .onFirstCall().resolves([{ return_log_exists: true, return_submission_exists: true }])
        .onSecondCall().resolves()
    })

    test("updates the return log's 'due_date', 'metadata', 'received_date', 'return_cycle_id', 'returns_frequency', 'sent_date', and 'status'", async () => {
      await PersistReturns.go([naldReturn], false, returnCycles)

      const params = db.query.secondCall.args[1]

      // Confirm all the params required were passed to the query
      expect(params).to.equal([
        '2017-11-28',
        '{"isSummer":true,"param":"value","version":"1"}',
        '2017-11-24',
        '2fc23cfc-6287-49ab-af8c-6c8215504722',
        'month',
        '2017-11-01',
        'completed',
        'v1:123:456'
      ])
    })
  })
})
