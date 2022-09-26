'use strict'

const { test, experiment, beforeEach, afterEach } = exports.lab = require('@hapi/lab').script()
const { expect } = require('@hapi/code')
const queryLoader = require('../../../../src/modules/charging-import/lib/query-loader')
const { logger } = require('../../../../src/logger')
const slack = require('../../../../src/lib/slack')
const { pool } = require('../../../../src/lib/connectors/db')

const sandbox = require('sinon').createSandbox()

experiment('modules/charging-import/lib/query-loader', () => {
  beforeEach(async () => {
    sandbox.stub(logger, 'info')
    sandbox.stub(slack, 'post')
    sandbox.stub(pool, 'query')
  })

  afterEach(async () => {
    sandbox.restore()
  })

  experiment('.createQueryLoader', () => {
    const name = 'Test job'
    const queries = [
      'select * from test_1',
      'select * from test_2'
    ]

    experiment('when there are no errors', () => {
      beforeEach(async () => {
        await queryLoader.loadQueries(name, queries)
      })

      test('logs a start message', async () => {
        expect(logger.info.firstCall.args[0]).to.equal(`Starting ${name}`)
      })

      test('slacks a start message', async () => {
        expect(slack.post.firstCall.args[0]).to.equal(`Starting ${name}`)
      })

      test('runs queries in order', async () => {
        expect(pool.query.firstCall.args[0]).to.equal(queries[0])
        expect(pool.query.secondCall.args[0]).to.equal(queries[1])
      })

      test('logs a finished message', async () => {
        expect(logger.info.lastCall.args[0]).to.equal(`Finished ${name}`)
      })

      test('slacks a finished message', async () => {
        expect(slack.post.lastCall.args[0]).to.equal(`Finished ${name}`)
      })
    })

    experiment('when there is an errors', () => {
      const err = new Error('oops!')
      let result

      beforeEach(async () => {
        pool.query.rejects(err)
        const func = () => queryLoader.loadQueries(name, queries)
        result = await expect(func()).to.reject()
      })

      test('logs a start message', async () => {
        expect(logger.info.firstCall.args[0]).to.equal(`Starting ${name}`)
      })

      test('slacks a start message', async () => {
        expect(slack.post.firstCall.args[0]).to.equal(`Starting ${name}`)
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

      test('does not log a finished message', async () => {
        expect(logger.info.calledWith(
          `Finished ${name}`
        )).to.be.false()
      })

      test('does not slack a finished message', async () => {
        expect(slack.post.calledWith(
          `Finished ${name}`
        )).to.be.false()
      })
    })
  })
})
