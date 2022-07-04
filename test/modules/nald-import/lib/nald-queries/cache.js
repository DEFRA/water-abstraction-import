'use strict'

const {
  experiment,
  test,
  beforeEach,
  afterEach
} = exports.lab = require('@hapi/lab').script()

const sandbox = require('sinon').createSandbox()

const { expect } = require('@hapi/code')

const cache = require('../../../../../src/modules/nald-import/lib/nald-queries/cache')
const { logger } = require('../../../../../src/logger')

experiment('modules/nald-import/lib/nald-queries/cache', () => {
  beforeEach(async () => {
    sandbox.stub(logger, 'info')
  })

  afterEach(async () => {
    sandbox.restore()
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
      spy = sandbox.spy()
      server = {
        cache: sandbox.spy()
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

      const loggerArgs = logger.info.lastCall.args
      expect(loggerArgs[0]).to.equal('Accessing database for test-method')
      expect(loggerArgs[1]).to.equal({ id: 123 })

      expect(spy.calledWith({ id: 123 })).to.equal(true)
    })
  })
})
