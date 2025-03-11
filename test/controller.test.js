'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Thing under test
const controller = require('../src/controller.js')

experiment('modules/controller', () => {
  let h

  beforeEach(() => {
    // Our own 'stub' of the h object Hapi passes through to all controllers.
    h = {
      response: (data) => {
        return {
          code: () => {
            return data
          }
        }
      }
    }
  })

  afterEach(() => {
    Sinon.restore()
  })

  experiment('.status()', () => {
    test('returns an object with the application status', () => {
      const response = controller.status(null, null)

      expect(response.status).to.equal('alive')
    })
  })

  experiment('.healthInfo()', () => {
    test('contains the expected water service version', async () => {
      const result = await controller.healthInfo(null, h)

      expect(result.version).to.exist()
    })

    test('contains the git commit hash', async () => {
      const result = await controller.healthInfo(null, h)

      expect(result.commit).to.exist()
    })
  })
})
