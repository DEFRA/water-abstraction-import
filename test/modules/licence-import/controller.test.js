'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Thing under test
const controller = require('../../../src/modules/licence-import/controller.js')

experiment('modules/licence-import/controller.js', () => {
  let code
  let h
  let request

  beforeEach(() => {
    code = Sinon.spy()
    h = {
      response: Sinon.stub().returns({
        code
      })
    }

    request = {
      server: {
        messageQueue: {
          deleteQueue: Sinon.stub().resolves(),
          publish: Sinon.stub().resolves()
        }
      },
      query: {}
    }
  })

  afterEach(async () => {
    Sinon.restore()
  })

  experiment('.postImport', () => {
    experiment('when the request succeeds', () => {
      test('the existing queue is deleted', async () => {
        await controller.postImport(request, h)

        const [jobName] = request.server.messageQueue.deleteQueue.firstCall.args

        expect(jobName).to.equal('licence-import.clean')
      })

      test('the Delete Documents job is published', async () => {
        await controller.postImport(request, h)

        const [message] = request.server.messageQueue.publish.firstCall.args

        expect(message).to.equal({
          name: 'licence-import.clean',
          options: { singletonKey: 'licence-import.clean', expireIn: '1 hours' }
        })
      })

      test('a 202 response code is returned', async () => {
        await controller.postImport(request, h)

        const [statusCode] = code.firstCall.args

        expect(statusCode).to.equal(202)
      })
    })

    experiment('when there is an error', () => {
      beforeEach(() => {
        request.server.messageQueue.deleteQueue.rejects()
      })

      test(' a Boom error is thrown', async () => {
        const error = await expect(controller.postImport(request, h)).to.reject()

        expect(error.output.payload.statusCode).to.equal(500)
      })
    })
  })

  experiment('.postImportCompany', () => {
    beforeEach(() => {
      request.query = { regionCode: 1, partyId: 37760 }
    })

    experiment('when the request succeeds', () => {
      test('the existing queue is deleted', async () => {
        await controller.postImportCompany(request, h)

        const [jobName] = request.server.messageQueue.deleteQueue.firstCall.args

        expect(jobName).to.equal('licence-import.import-company')
      })

      test('the Import Company job is published', async () => {
        await controller.postImportCompany(request, h)

        const [message] = request.server.messageQueue.publish.firstCall.args

        expect(message).to.equal({
          name: 'licence-import.import-company',
          data: { regionCode: 1, partyId: 37760, jobNumber: 1, numberOfJobs: 1 },
          options: { singletonKey: 'licence-import.import-company.1.37760', expireIn: '1 hours' }
        })
      })

      test('a 202 response code is returned', async () => {
        await controller.postImportCompany(request, h)

        const [statusCode] = code.firstCall.args

        expect(statusCode).to.equal(202)
      })
    })
  })

  experiment('.postImportLicence', () => {
    beforeEach(() => {
      request.query = { licenceNumber: '01/123' }
    })

    experiment('when the request succeeds', () => {
      test('the existing queue is deleted', async () => {
        await controller.postImportLicence(request, h)

        const [jobName] = request.server.messageQueue.deleteQueue.firstCall.args

        expect(jobName).to.equal('licence-import.import-licence')
      })

      test('the Import Licence job is published', async () => {
        await controller.postImportLicence(request, h)

        const [message] = request.server.messageQueue.publish.firstCall.args

        expect(message).to.equal({
          name: 'licence-import.import-licence',
          data: { licenceNumber: '01/123', jobNumber: 1, numberOfJobs: 1 },
          options: { singletonKey: 'licence-import.import-licence.01/123' }
        })
      })

      test('a 202 response code is returned', async () => {
        await controller.postImportLicence(request, h)

        const [statusCode] = code.firstCall.args

        expect(statusCode).to.equal(202)
      })
    })
  })
})
