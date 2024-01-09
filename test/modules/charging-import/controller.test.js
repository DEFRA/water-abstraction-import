'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Test helpers
const chargeVersionsJob = require('../../../src/modules/charging-import/jobs/charge-versions')

// Thing under test
const controller = require('../../../src/modules/charging-import/controller')

experiment('modules/charging-import/controller.js', () => {
  let h
  let code

  beforeEach(async () => {
    code = Sinon.spy()
    h = {
      response: Sinon.stub().returns({
        code
      })
    }
  })

  afterEach(async () => {
    Sinon.restore()
  })

  experiment('postImportChargeVersions', () => {
    let request

    beforeEach(async () => {
      request = {
        messageQueue: {
          publish: Sinon.stub().resolves(),
          deleteQueue: Sinon.stub().resolves()
        }
      }

      await controller.postImportChargeVersions(request, h)
    })

    test('clears the message queue of existing jobs', async () => {
      const [jobName] = request.messageQueue.deleteQueue.lastCall.args
      expect(jobName).to.equal(chargeVersionsJob.jobName)
    })

    test('publishes a message to the message queue to begin the import', async () => {
      const [message] = request.messageQueue.publish.lastCall.args
      expect(message.name).to.equal(chargeVersionsJob.jobName)
    })

    test('a 204 response code is used', async () => {
      const [statusCode] = code.lastCall.args
      expect(statusCode).to.equal(204)
    })
  })
})
