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
const PersistReturns = require('../../../../src/modules/return-logs/lib/persist-returns.js')

experiment('modules/return-logs/lib/persist-returns', () => {
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

  const digitalServiceReturn = {
    return_id: 'v1:234:789',
    regime: 'water',
    licence_type: 'abstraction',
    licence_ref: '04/567/890',
    start_date: '2017-11-01',
    end_date: '2018-10-31',
    returns_frequency: 'month',
    status: 'due',
    source: 'NALD',
    metadata: { param: 'value', version: '1' },
    received_date: '2018-11-24',
    return_requirement: '67890',
    due_date: '2018-11-28'
  }

  afterEach(() => {
    Sinon.restore()
  })

  experiment('when the return does not exist', () => {
    beforeEach(() => {
      Sinon.stub(db, 'query')
        .onFirstCall().resolves([{ exists: false }])
        .onSecondCall().resolves([{ return_cycle_id: '40eb9d9e-0cad-4794-b7eb-dfc7ccaf8b26' }])
        .onThirdCall().resolves()
    })

    experiment("and its 'endDate' is before 2018-10-31", () => {
      test('creates the return log based on the NALD row data', async () => {
        await PersistReturns.go([naldReturn], false)

        const [_query, params] = db.query.thirdCall.args

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

    experiment("and its 'endDate' is after 2018-10-31", () => {
      test('creates the return log based on the WRLS row data', async () => {
        await PersistReturns.go([digitalServiceReturn], false)

        const [_query, params] = db.query.thirdCall.args

        // Confirm all the params required were passed to the query
        expect(params).to.equal([
          '2018-11-28',
          '2018-10-31',
          '04/567/890',
          'abstraction',
          { param: 'value', version: '1' },
          '2018-11-24',
          'water',
          'v1:234:789',
          '67890',
          'month',
          'NALD',
          '2017-11-01',
          'due',
          '40eb9d9e-0cad-4794-b7eb-dfc7ccaf8b26'
        ])
      })
    })
  })

  experiment('when the return already exists', () => {
    beforeEach(async () => {
      Sinon.stub(db, 'query')
        .onFirstCall().resolves([{ exists: true }])
        .onSecondCall().resolves()
    })

    experiment("and its 'endDate' is before 2018-10-31", () => {
      test("updates the return log's 'due_date', 'metadata', 'received_date' and 'status'", async () => {
        await PersistReturns.go([naldReturn], false)

        const [_query, params] = db.query.secondCall.args

        // Confirm all the params required were passed to the query
        expect(params).to.equal([
          '2017-11-28',
          '{"param":"value","version":"1"}',
          '2017-11-24',
          'completed',
          'v1:123:456'
        ])
      })
    })

    experiment("and its 'endDate' is after 2018-10-31", () => {
      test("updates only the return log's 'due_date' and 'metadata'", async () => {
        await PersistReturns.go([digitalServiceReturn], false)

        const [_query, params] = db.query.secondCall.args

        // Confirm all the params required were passed to the query
        expect(params).to.equal([
          '2018-11-28',
          { param: 'value', version: '1' },
          'v1:234:789'
        ])
      })
    })
  })
})
