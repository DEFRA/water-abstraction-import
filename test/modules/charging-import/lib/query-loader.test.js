'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Things we need to stub
const { pool } = require('../../../../src/lib/connectors/db')

// Thing under test
const QueryLoader = require('../../../../src/modules/charging-import/lib/query-loader')

experiment('modules/charging-import/lib/query-loader', () => {
  beforeEach(async () => {
    Sinon.stub(pool, 'query')
  })

  afterEach(async () => {
    Sinon.restore()
  })

  experiment('.loadQueries', () => {
    const queries = [
      'select * from test_1',
      'select * from test_2'
    ]

    experiment('when there are no errors', () => {
      beforeEach(async () => {
        await QueryLoader.loadQueries(queries)
      })

      test('runs queries in order', async () => {
        expect(pool.query.firstCall.args[0]).to.equal(queries[0])
        expect(pool.query.secondCall.args[0]).to.equal(queries[1])
      })
    })

    experiment('when there is an error', () => {
      const err = new Error('oops!')
      let result

      beforeEach(async () => {
        pool.query.rejects(err)
        const func = () => QueryLoader.loadQueries(queries)
        result = await expect(func()).to.reject()
      })

      test('runs the first query order', async () => {
        expect(pool.query.firstCall.args[0]).to.equal(queries[0])
      })

      test('errors before the second query', async () => {
        expect(pool.query.calledWith(queries[1])).to.be.false()
      })

      test('rejects with the thrown error', async () => {
        expect(result).to.equal(err)
      })
    })
  })
})
