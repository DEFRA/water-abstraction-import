'use strict'

const {
  experiment,
  test,
  beforeEach,
  afterEach
} = exports.lab = require('@hapi/lab').script()

const { expect } = require('@hapi/code')
const sandbox = require('sinon').createSandbox()

const cams = require('../../../../../src/modules/nald-import/lib/nald-queries/cams')
const cache = require('../../../../../src/modules/nald-import/lib/nald-queries/cache')
const db = require('../../../../../src/modules/nald-import/lib/db')
const sql = require('../../../../../src/modules/nald-import/lib/nald-queries/sql/cams')

experiment('modules/nald-import/lib/queries/cams', () => {
  beforeEach(async () => {
    sandbox.stub(db, 'dbQuery')
    sandbox.stub(cache, 'createCachedQuery')
  })

  afterEach(async () => {
    sandbox.restore()
  })

  experiment('._createCamsCache', async () => {
    test('creates a cache with the expected method name', async () => {
      cams._createCamsCache()
      const [, methodName] = cache.createCachedQuery.lastCall.args
      expect(methodName).to.equal('getCams')
    })

    test('creates a cache with the required generate func', async () => {
      cams._createCamsCache()
      const [, , generate] = cache.createCachedQuery.lastCall.args
      const id = { code: 'test-code', regionCode: 'test-region-code' }

      await generate(id)

      const [query, params] = db.dbQuery.lastCall.args

      expect(query).to.equal(sql.getCams)
      expect(params).to.equal(['test-code', 'test-region-code'])
    })
  })

  experiment('.getCams', () => {
    test('passes the expected id object to the cache provider', async () => {
      sandbox.stub(cams._getCamsCache, 'get')

      await cams.getCams('test-code', 'test-region')

      const [id] = cams._getCamsCache.get.lastCall.args

      expect(id.id).to.equal('cams:code:test-code:regionCode:test-region')
      expect(id.code).to.equal('test-code')
      expect(id.regionCode).to.equal('test-region')
    })
  })
})
