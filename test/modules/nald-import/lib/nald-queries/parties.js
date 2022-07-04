'use strict'

const {
  experiment,
  test,
  beforeEach,
  afterEach
} = exports.lab = require('@hapi/lab').script()

const { expect } = require('@hapi/code')
const sandbox = require('sinon').createSandbox()

const parties = require('../../../../../src/modules/nald-import/lib/nald-queries/parties')
const cache = require('../../../../../src/modules/nald-import/lib/nald-queries/cache')
const db = require('../../../../../src/modules/nald-import/lib/db')
const sql = require('../../../../../src/modules/nald-import/lib/nald-queries/sql/parties')

experiment('modules/nald-import/lib/queries/parties', () => {
  beforeEach(async () => {
    sandbox.stub(db, 'dbQuery')
    sandbox.stub(cache, 'createCachedQuery')
  })

  afterEach(async () => {
    sandbox.restore()
  })

  experiment('._createPartiesCache', async () => {
    test('creates a cache with the expected method name', async () => {
      parties._createPartiesCache()
      const [, methodName] = cache.createCachedQuery.lastCall.args
      expect(methodName).to.equal('getParties')
    })

    test('creates a cache with the required generate func', async () => {
      parties._createPartiesCache()
      const [, , generate] = cache.createCachedQuery.lastCall.args
      const id = { partyId: 'test-party', regionCode: 'test-region' }

      await generate(id)

      const [query, params] = db.dbQuery.lastCall.args

      expect(query).to.equal(sql.getParties)
      expect(params).to.equal(['test-party', 'test-region'])
    })
  })

  experiment('.getParties', () => {
    test('passes the expected id object to the cache provider', async () => {
      sandbox.stub(parties._getPartiesCache, 'get')

      await parties.getParties('test-party', 'test-region')

      const [id] = parties._getPartiesCache.get.lastCall.args

      expect(id.id).to.equal('parties:partyId:test-party:regionCode:test-region')
      expect(id.partyId).to.equal('test-party')
      expect(id.regionCode).to.equal('test-region')
    })
  })

  experiment('._createPartyContactsCache', async () => {
    test('creates a cache with the expected method name', async () => {
      parties._createPartyContactsCache()
      const [, methodName] = cache.createCachedQuery.lastCall.args
      expect(methodName).to.equal('getPartyContacts')
    })

    test('creates a cache with the required generate func', async () => {
      parties._createPartyContactsCache()
      const [, , generate] = cache.createCachedQuery.lastCall.args
      const id = { partyId: 'test-party', regionCode: 'test-region' }

      await generate(id)

      const [query, params] = db.dbQuery.lastCall.args

      expect(query).to.equal(sql.getPartyContacts)
      expect(params).to.equal(['test-party', 'test-region'])
    })
  })

  experiment('.getPartyContacts', () => {
    test('passes the expected id object to the cache provider', async () => {
      sandbox.stub(parties._getPartyContactsCache, 'get')

      await parties.getPartyContacts('test-party', 'test-region')

      const [id] = parties._getPartyContactsCache.get.lastCall.args

      expect(id.id).to.equal('partyContacts:partyId:test-party:regionCode:test-region')
      expect(id.partyId).to.equal('test-party')
      expect(id.regionCode).to.equal('test-region')
    })
  })

  experiment('.getParty', () => {
    beforeEach(async () => {
      await parties.getParty('test-party', 'test-region')
    })

    test('uses the correct query', async () => {
      const [query] = db.dbQuery.lastCall.args
      expect(query).to.equal(sql.getParty)
    })

    test('passes the expected params to the database query', async () => {
      const [, params] = db.dbQuery.lastCall.args
      expect(params).to.equal(['test-party', 'test-region'])
    })
  })
})
