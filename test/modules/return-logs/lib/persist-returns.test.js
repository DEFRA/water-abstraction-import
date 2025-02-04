'use strict'

const sandbox = require('sinon').createSandbox()

const { experiment, test, beforeEach, afterEach } = exports.lab = require('@hapi/lab').script()
const { expect } = require('@hapi/code')
const { v4: uuid } = require('uuid')

const returnsConnector = require('../../../../src/lib/connectors/returns.js')
const db = require('../../../../src/lib/connectors/db.js')
const persistReturns = require('../../../../src/modules/return-logs/lib/persist-returns.js')

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

experiment('modules/return-logs/lib/persist-returns', () => {
  beforeEach(async () => {
    sandbox.stub(returnsConnector.returns, 'create')

    sandbox.stub(returnsConnector.versions, 'create').resolves({
      data: {
        version_id: uuid(),
        return_id: 'v1:234:789'
      }
    })
    sandbox.stub(returnsConnector.versions, 'updateOne')

    sandbox.stub(returnsConnector.lines, 'create')
  })

  afterEach(async () => {
    sandbox.restore()
  })

  experiment('#persistReturns', () => {
    experiment('when the return does not exist', () => {
      beforeEach(async () => {
        sandbox.stub(db, 'query').resolves([{ exists: false }])

        returnsConnector.returns.create.resolves({ error: null })
      })

      test('creates a row', async () => {
        await persistReturns.persistReturns([naldReturn], false)

        expect(returnsConnector.returns.create.firstCall.args[0]).to.equal(naldReturn)

        // Confirm no call to update the return log was fired
        expect(db.query.calledOnce).to.be.true()
      })
    })

    experiment('when the return already exists', () => {
      beforeEach(async () => {
        sandbox.stub(db, 'query')
          .onFirstCall().resolves([{ exists: true }])
          .onSecondCall().resolves()
      })

      experiment("and its 'endDate' is before 2018-10-31", () => {
        test("updates the return log's 'due_date', 'metadata', 'received_date' and 'status'", async () => {
          await persistReturns.persistReturns([naldReturn], false)

          const [query, params] = db.query.secondCall.args

          // Confirm it used the pre nov 2018 version of the update query
          expect(query.endsWith('WHERE return_id = $5;\n')).to.be.true()

          // Confirm all the params required were passed to the query
          expect(params).to.equal([
            '2017-11-28',
            '{"param":"value","version":"1"}',
            '2017-11-24',
            'completed',
            'v1:123:456'
          ])

          // Confirm no call to create the return log was fired
          expect(returnsConnector.returns.create.firstCall).to.equal(null)
        })
      })

      experiment("and its 'endDate' is after 2018-10-31", () => {
        test("updates only the return log's 'due_date' and 'metadata'", async () => {
          await persistReturns.persistReturns([digitalServiceReturn], false)

          const [query, params] = db.query.secondCall.args

          // Confirm it used the post nov 2018 version of the update query
          expect(query.endsWith('WHERE return_id = $3;\n')).to.be.true()

          // Confirm all the params required were passed to the query
          expect(params).to.equal([
            '2018-11-28',
            { param: 'value', version: '1' },
            'v1:234:789'
          ])

          // Confirm no call to create the return log was fired
          expect(returnsConnector.returns.create.firstCall).to.equal(null)
        })
      })
    })
  })
})
