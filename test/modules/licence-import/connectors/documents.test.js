'use strict'

const {
  experiment,
  test,
  beforeEach,
  afterEach
} = exports.lab = require('@hapi/lab').script()

const { expect } = require('@hapi/code')
const sandbox = require('sinon').createSandbox()

const { pool } = require('../../../../src/lib/connectors/db')
const queries = require('../../../../src/modules/licence-import/connectors/queries/documents')
const connector = require('../../../../src/modules/licence-import/connectors/documents')

experiment('modules/licence-import/connectors/documents', () => {
  beforeEach(async () => {
    sandbox.stub(pool, 'query')
  })

  afterEach(async () => {
    sandbox.restore()
  })

  experiment('deleteRemovedDocuments', () => {
    beforeEach(async () => {
      await connector.deleteRemovedDocuments()
    })

    test('passes the expected query to the pool', async () => {
      const [query] = pool.query.lastCall.args
      expect(query).to.equal(queries.deleteCrmV2Documents)
    })
  })
})
