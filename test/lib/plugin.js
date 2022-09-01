'use strict'

const {
  experiment,
  test,
  beforeEach,
  afterEach
} = exports.lab = require('@hapi/lab').script()

const { expect } = require('@hapi/code')
const sandbox = require('sinon').createSandbox()

const plugin = require('../../src/lib/plugin')

experiment('lib/plugin', () => {
  experiment('createRegister', () => {
    let registerSubscribers
    let server

    beforeEach(async () => {
      registerSubscribers = sandbox.spy()
      server = Symbol('test server')
    })

    afterEach(async () => {
      sandbox.restore()
    })

    test('registerSubscribers is called', async () => {
      plugin.createRegister(server, registerSubscribers)

      expect(registerSubscribers.called).to.equal(true)
    })
  })
})
