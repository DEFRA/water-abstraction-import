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
  let notifierStub

  beforeEach(async () => {
    Sinon.stub(pool, 'query')

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

  experiment('.createQueryLoader', () => {
    const name = 'Test job'
    const queries = [
      'select * from test_1',
      'select * from test_2'
    ]

    experiment('when there are no errors', () => {
      beforeEach(async () => {
        await QueryLoader.loadQueries(name, queries)
      })

      test('logs a start message', async () => {
        expect(notifierStub.omg.calledWith('Test job: started')).to.be.true()
      })

      test('runs queries in order', async () => {
        expect(pool.query.firstCall.args[0]).to.equal(queries[0])
        expect(pool.query.secondCall.args[0]).to.equal(queries[1])
      })

      test('logs a finished message', async () => {
        expect(notifierStub.omg.calledWith('Test job: finished')).to.be.true()
      })
    })

    experiment('when there is an error', () => {
      const err = new Error('oops!')
      let result

      beforeEach(async () => {
        pool.query.rejects(err)
        const func = () => QueryLoader.loadQueries(name, queries)
        result = await expect(func()).to.reject()
      })

      test('runs the first query order', async () => {
        expect(pool.query.firstCall.args[0]).to.equal(queries[0])
      })

      test('errors before the second query', async () => {
        expect(pool.query.calledWith(queries[1])).to.be.false()
      })

      test('logs the error', async () => {
        expect(notifierStub.omfg.calledWith('Test job: errored', err)).to.be.true()
      })

      test('rejects with the thrown error', async () => {
        expect(result).to.equal(err)
      })
    })
  })
})
