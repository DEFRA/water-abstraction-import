'use strict'

const {
  experiment,
  test,
  beforeEach,
  afterEach
} = exports.lab = require('@hapi/lab').script()

const { expect } = require('@hapi/code')
const sandbox = require('sinon').createSandbox()

const config = require('../../../../config')
const { serviceRequest } = require('@envage/water-abstraction-helpers')
const connector = require('../../../../src/lib/connectors/water/application-state')

experiment('lib/connectors/water/application-state', () => {
  beforeEach(async () => {
    sandbox.stub(serviceRequest, 'get')
    sandbox.stub(serviceRequest, 'post')
    sandbox.stub(config.services, 'water').value('http://example.com')
  })

  afterEach(async () => {
    sandbox.restore()
  })

  experiment('.getState', () => {
    test('makes a request to the expected url', async () => {
      await connector.getState('test-key')
      const [url] = serviceRequest.get.lastCall.args

      expect(url).to.equal('http://example.com/application-state/test-key')
    })

    test('returns the data', async () => {
      serviceRequest.get.resolves({
        applicationStateId: 'test-key'
      })

      const state = await connector.getState('test-key')

      expect(state.applicationStateId).to.equal('test-key')
    })
  })

  experiment('.postState', () => {
    test('makes a request to the expected url', async () => {
      await connector.postState('test-key', { data: true })
      const [url] = serviceRequest.post.lastCall.args

      expect(url).to.equal('http://example.com/application-state/test-key')
    })

    test('includes the data in the request', async () => {
      await connector.postState('test-key', { data: true })
      const [, options] = serviceRequest.post.lastCall.args

      expect(options.body.data).to.equal(true)
    })

    test('returns the data', async () => {
      serviceRequest.post.resolves({
        applicationStateId: 'test-key'
      })

      const state = await connector.postState('test-key', { data: true })

      expect(state.applicationStateId).to.equal('test-key')
    })
  })
})
