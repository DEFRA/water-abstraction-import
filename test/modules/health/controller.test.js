'use strict'

// Test framework dependencies
const { test, experiment, before } = exports.lab = require('@hapi/lab').script()
const { expect } = require('@hapi/code')

// Test helpers
const pkg = require('../../../package.json')

// Thing under test
const controller = require('../../../src/modules/health/controller')

experiment.only('modules/health/controller', () => {
  experiment('.getInfo', () => {
    let info

    before(async () => {
      info = await controller.getInfo()
    })

    test('contains the expected water service version', async () => {
      expect(info.version).to.equal(pkg.version)
    })

    test('contains the git commit hash', async () => {
      expect(info.commit).to.exist()
    })
  })
})
