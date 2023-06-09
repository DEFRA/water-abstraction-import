'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Test helpers
const pkg = require('../../../package.json')

// Thing under test
const controller = require('../../../src/modules/health/controller')

experiment('modules/health/controller', () => {
  afterEach(() => {
    Sinon.restore()
  })

  experiment('.getAirbrake', () => {
    let notifyFake
    let request

    beforeEach(() => {
      notifyFake = Sinon.fake()
      // Our own 'stub' of the request object Hapi passes through to all controllers populated with a fake Airbrake
      // object. Ordinarily this gets added by the AirbrakePlugin during startup
      request = {
        info: { id: 'a188f37b-6b49-4267-8a56-23fdc696cfd9' },
        server: { app: { airbrake: { notify: notifyFake } } }
      }
    })

    test('sends an airbrake notification then throws an error', async () => {
      await expect(controller.getAirbrake(request, null)).to.reject()

      const notifyParam = notifyFake.args[0][0]

      expect(notifyFake.called).to.be.true()
      expect(notifyParam.session.req.id).to.equal(request.info.id)
    })
  })

  experiment('.getInfo', () => {
    // Our own 'stub' of the h object Hapi passes through to all controllers.
    const h = {
      response: (data) => {
        return {
          code: () => {
            return data
          }
        }
      }
    }

    test('contains the expected water service version', async () => {
      const result = await controller.getInfo(null, h)

      expect(result.version).to.equal(pkg.version)
    })

    test('contains the git commit hash', async () => {
      const result = await controller.getInfo(null, h)

      expect(result.commit).to.exist()
    })
  })
})
