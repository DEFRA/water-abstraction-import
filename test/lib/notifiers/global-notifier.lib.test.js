'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Things we need to stub
const BaseNotifierLib = require('../../../src/lib/notifiers/base-notifier.lib.js')

// Thing under test
const GlobalNotifierLib = require('../../../src/lib/notifiers/global-notifier.lib.js')

experiment('GlobalNotifierLib class', () => {
  let airbrakeFake
  let pinoFake

  beforeEach(async () => {
    airbrakeFake = { notify: Sinon.fake.resolves({ id: 1 }), flush: Sinon.fake() }
    Sinon.stub(BaseNotifierLib.prototype, '_setNotifier').returns(airbrakeFake)

    pinoFake = { info: Sinon.fake(), error: Sinon.fake() }
    Sinon.stub(BaseNotifierLib.prototype, '_setLogger').returns(pinoFake)
  })

  afterEach(() => {
    Sinon.restore()
  })

  experiment('#constructor', () => {
    experiment("when the 'logger' argument is not provided", () => {
      test('throws an error', () => {
        expect(() => new GlobalNotifierLib(null, airbrakeFake)).to.throw()
      })
    })

    experiment("when the 'notifier' argument is not provided", () => {
      test('throws an error', () => {
        expect(() => new GlobalNotifierLib(pinoFake)).to.throw()
      })
    })
  })
})
