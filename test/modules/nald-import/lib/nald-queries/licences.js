'use strict'

const {
  experiment,
  test,
  beforeEach,
  afterEach
} = exports.lab = require('@hapi/lab').script()

const { expect } = require('@hapi/code')
const sandbox = require('sinon').createSandbox()

const licences = require('../../../../../src/modules/nald-import/lib/nald-queries/licences')
const db = require('../../../../../src/modules/nald-import/lib/db')
const sql = require('../../../../../src/modules/nald-import/lib/nald-queries/sql/licences')

experiment('modules/nald-import/lib/nald-queries/licences', () => {
  beforeEach(async () => {
    sandbox.stub(db, 'dbQuery').resolves([])
  })

  afterEach(async () => {
    sandbox.restore()
  })

  experiment('.getLicence', () => {
    beforeEach(async () => {
      await licences.getLicence('123')
    })
    test('uses the correct query', async () => {
      const [query] = db.dbQuery.lastCall.args
      expect(query).to.equal(sql.getLicence)
    })

    test('passes the expected params', async () => {
      const [, params] = db.dbQuery.lastCall.args
      expect(params).to.equal(['123'])
    })
  })

  experiment('.getCurrentVersion', () => {
    beforeEach(async () => {
      await licences.getCurrentVersion('licence-id', 'region-code')
    })
    test('uses the correct query', async () => {
      const [query] = db.dbQuery.lastCall.args
      expect(query).to.equal(sql.getCurrentVersion)
    })

    test('passes the expected params', async () => {
      const [, params] = db.dbQuery.lastCall.args
      expect(params).to.equal(['licence-id', 'region-code'])
    })
  })

  experiment('.getVersions', () => {
    beforeEach(async () => {
      await licences.getVersions('licence-id', 'region-code')
    })
    test('uses the correct query', async () => {
      const [query] = db.dbQuery.lastCall.args
      expect(query).to.equal(sql.getVersions)
    })

    test('passes the expected params', async () => {
      const [, params] = db.dbQuery.lastCall.args
      expect(params).to.equal(['licence-id', 'region-code'])
    })
  })

  experiment('.getCurrentFormats', () => {
    beforeEach(async () => {
      await licences.getCurrentFormats('licence-id', 'region-code')
    })
    test('uses the correct query', async () => {
      const [query] = db.dbQuery.lastCall.args
      expect(query).to.equal(sql.getCurrentFormats)
    })

    test('passes the expected params', async () => {
      const [, params] = db.dbQuery.lastCall.args
      expect(params).to.equal(['licence-id', 'region-code'])
    })
  })
})
