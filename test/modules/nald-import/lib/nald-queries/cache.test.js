'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Thing under test
const cache = require('../../../../../src/modules/nald-import/lib/nald-queries/cache')

experiment('modules/nald-import/lib/nald-queries/cache', () => {
  afterEach(async () => {
    Sinon.restore()
  })

  experiment('.createId', () => {
    test('makes the id using the key and params', async () => {
      const key = 'key'
      const params = {
        regionCode: 1,
        licenceNumber: '123'
      }

      const id = cache.createId(key, params)

      expect(id.id).to.equal('key:regionCode:1:licenceNumber:123')
    })

    test('includes the params', async () => {
      const key = 'key'
      const params = {
        regionCode: 1,
        licenceNumber: '123'
      }

      const id = cache.createId(key, params)

      expect(id.regionCode).to.equal(1)
      expect(id.licenceNumber).to.equal('123')
    })
  })

  experiment('.createCachedQuery', () => {
    let server
    let spy

    beforeEach(async () => {
      spy = Sinon.spy()
      server = {
        cache: Sinon.spy()
      }

      cache.createCachedQuery(server, 'test-method', spy)
    })

    test('uses the method name for the cache segment', async () => {
      const [cacheArg] = server.cache.lastCall.args
      expect(cacheArg.segment).to.equal('test-method')
    })

    test('sets a cache duration of five minutes', async () => {
      const [cacheArg] = server.cache.lastCall.args
      expect(cacheArg.expiresIn).to.equal(5 * 60 * 1000)
    })

    test('sets a generate timeout of five seconds', async () => {
      const [cacheArg] = server.cache.lastCall.args
      expect(cacheArg.generateTimeout).to.equal(5 * 1000)
    })

    test('configures the generate function', async () => {
      const [cacheArg] = server.cache.lastCall.args
      const generate = cacheArg.generateFunc

      generate({ id: 123 })

      expect(spy.calledWith({ id: 123 })).to.equal(true)
    })
  })
})
