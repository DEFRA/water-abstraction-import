'use strict'

const {
  experiment,
  test,
  beforeEach,
  afterEach
} = exports.lab = require('@hapi/lab').script()

const { expect } = require('@hapi/code')
const sandbox = require('sinon').createSandbox()

const roles = require('../../../../../src/modules/nald-import/lib/nald-queries/roles')
const db = require('../../../../../src/modules/nald-import/lib/db')
const sql = require('../../../../../src/modules/nald-import/lib/nald-queries/sql/roles')

experiment('modules/nald-import/lib/nald-queries/roles', () => {
  beforeEach(async () => {
    sandbox.stub(db, 'dbQuery').resolves([])
  })

  afterEach(async () => {
    sandbox.restore()
  })

  experiment('.getRoles', () => {
    beforeEach(async () => {
      await roles.getRoles('test-id', 'test-region')
    })
    test('uses the correct query', async () => {
      const [query] = db.dbQuery.lastCall.args
      expect(query).to.equal(sql.getRoles)
    })

    test('passes the expected params', async () => {
      const [, params] = db.dbQuery.lastCall.args
      expect(params).to.equal(['test-id', 'test-region'])
    })
  })
})
