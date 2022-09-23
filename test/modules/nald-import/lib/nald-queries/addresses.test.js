'use strict'

const {
  experiment,
  test,
  beforeEach,
  afterEach
} = exports.lab = require('@hapi/lab').script()

const { expect } = require('@hapi/code')
const sandbox = require('sinon').createSandbox()

const addresses = require('../../../../../src/modules/nald-import/lib/nald-queries/addresses')
const db = require('../../../../../src/modules/nald-import/lib/db')
const sql = require('../../../../../src/modules/nald-import/lib/nald-queries/sql/addresses')

experiment('modules/nald-import/lib/nald-queries/addresses', () => {
  beforeEach(async () => {
    sandbox.stub(db, 'dbQuery')
  })

  afterEach(async () => {
    sandbox.restore()
  })

  experiment('.getAddress', () => {
    beforeEach(async () => {
      await addresses.getAddress('test-address-id', 'test-region-id')
    })

    test('uses the correct query', async () => {
      const [query] = db.dbQuery.lastCall.args
      expect(query).to.equal(sql.getAddress)
    })

    test('passes the expected params to the database query', async () => {
      const [, params] = db.dbQuery.lastCall.args
      expect(params).to.equal(['test-address-id', 'test-region-id'])
    })
  })
})
