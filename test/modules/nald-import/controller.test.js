'use strict'

const {
  experiment,
  test,
  beforeEach,
  afterEach
} = exports.lab = require('@hapi/lab').script()

const { expect } = require('@hapi/code')
const sandbox = require('sinon').createSandbox()

const controller = require('../../../src/modules/nald-import/controller')

experiment('modules/nald-import/controller', () => {
  let request
  let h
  let code

  beforeEach(async () => {
    code = sandbox.spy()
    h = {
      response: sandbox.stub().returns({
        code
      })
    }

    request = {
      server: {
        messageQueue: {
          publish: sandbox.stub().resolves()
        }
      }
    }
  })

  afterEach(async () => {
    sandbox.restore()
  })

  experiment('.postImportLicence', () => {
    experiment('when the message is published', () => {
      beforeEach(async () => {
        request.payload = {
          licenceNumber: 'test-licence'
        }

        await controller.postImportLicence(request, h)
      })

      test('the expected message is published', async () => {
        const [message] = request.server.messageQueue.publish.lastCall.args
        expect(message).to.equal({
          name: 'nald-import.import-licence',
          data: { licenceNumber: 'test-licence' },
          options: { singletonKey: 'test-licence' }
        })
      })

      test('the message is returned in the response', async () => {
        const [message] = h.response.lastCall.args
        expect(message).to.equal({
          name: 'nald-import.import-licence',
          data: { licenceNumber: 'test-licence' },
          options: { singletonKey: 'test-licence' }
        })
      })

      test('a 202 response code is used', async () => {
        const [statusCode] = code.lastCall.args
        expect(statusCode).to.equal(202)
      })
    })

    experiment('when the message fails to publish', () => {
      test('the error is returned', async () => {
        request.payload = {
          licenceNumber: 'test-licence'
        }
        request.server.messageQueue.publish.rejects(new Error('fail'))
        const err = await expect(controller.postImportLicence(request, h)).to.reject()

        expect(err.output.payload.statusCode).to.equal(500)
      })
    })
  })
})
