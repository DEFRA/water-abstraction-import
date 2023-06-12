'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Test helpers
const jobs = require('../../../src/modules/licence-import/jobs')

// Thing under test
const controller = require('../../../src/modules/licence-import/controller.js')

const createRequest = () => ({
  query: {},
  messageQueue: {
    publish: Sinon.stub().resolves()
  }
})

experiment('modules/licence-import/controller.js', () => {
  let h

  experiment('.postImport', () => {
    let request, response

    beforeEach(async () => {
      h = {
        response: Sinon.stub().returnsThis(),
        code: Sinon.stub()
      }
    })

    afterEach(async () => {
      Sinon.restore()
    })

    experiment('when there are no errors', () => {
      beforeEach(async () => {
        request = createRequest()
        response = await controller.postImport(request, h)
      })

      test('an "import delete documents" job is published', async () => {
        expect(request.messageQueue.publish.callCount).to.equal(1)
        const [job] = request.messageQueue.publish.lastCall.args
        expect(job.name).to.equal(jobs.DELETE_DOCUMENTS_JOB)
      })

      test('a success response is returned', async () => {
        expect(h.response.calledWith({ error: null })).to.be.true()
      })

      test('a 202 http status code is returned', async () => {
        expect(h.code.calledWith(202)).to.be.true()
      })
    })

    experiment('when there is an error', () => {
      beforeEach(async () => {
        request = createRequest()
        request.messageQueue.publish.rejects()
        response = await controller.postImport(request, h)
      })

      test('a Boom 500 error is returned', async () => {
        expect(response.isBoom).to.equal(true)
        expect(response.output.statusCode).to.equal(500)
      })
    })
  })

  experiment('.postImportLicence', () => {
    let request
    let h
    let response
    let code

    beforeEach(async () => {
      code = Sinon.spy()

      h = {
        response: Sinon.stub().returns({ code })
      }
    })

    afterEach(async () => {
      Sinon.restore()
    })

    experiment('when there are no errors', () => {
      beforeEach(async () => {
        request = createRequest()
        request.query.licenceNumber = 'test-lic'
        await controller.postImportLicence(request, h)
      })

      test('an "import licence" job is published', async () => {
        expect(request.messageQueue.publish.callCount).to.equal(1)
        const [job] = request.messageQueue.publish.lastCall.args
        expect(job.name).to.equal(jobs.IMPORT_LICENCE_JOB)
      })

      test('a success response is returned', async () => {
        const [data] = h.response.lastCall.args
        const [statusCode] = code.lastCall.args

        expect(data).to.equal({ error: null })
        expect(statusCode).to.equal(202)
      })
    })

    experiment('when there is an error', () => {
      beforeEach(async () => {
        request = createRequest()
        request.query.licenceNumber = 'test-lic'
        request.messageQueue.publish.rejects()
        response = await controller.postImportLicence(request, h)
      })

      test('a Boom 500 error is returned', async () => {
        expect(response.isBoom).to.equal(true)
        expect(response.output.statusCode).to.equal(500)
      })
    })
  })
})
