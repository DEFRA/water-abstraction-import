'use strict'

const {
  experiment,
  test,
  beforeEach,
  afterEach
} = exports.lab = require('@hapi/lab').script()

const { expect } = require('@hapi/code')
const sandbox = require('sinon').createSandbox()

const importConnector = require('../../../src/lib/connectors/import')
const importService = require('../../../src/lib/services/import')

experiment('lib/services/import', () => {
  beforeEach(async () => {
    sandbox.stub(importConnector, 'getLicenceNumbers')
    sandbox.stub(importConnector, 'deleteRemovedDocuments')
  })

  afterEach(async () => {
    sandbox.restore()
  })

  experiment('.getLicenceNumbers', () => {
    experiment('when there is no data', () => {
      test('returns an empty array', async () => {
        importConnector.getLicenceNumbers.resolves([])
        const licences = await importService.getLicenceNumbers()

        expect(licences).to.equal([])
      })
    })

    experiment('when there is data', () => {
      test('returns an array of licence numbers', async () => {
        importConnector.getLicenceNumbers.resolves([
          { LIC_NO: '111' },
          { LIC_NO: '222' },
          { LIC_NO: '333' }
        ])
        const licences = await importService.getLicenceNumbers()

        expect(licences).to.equal(['111', '222', '333'])
      })
    })
  })

  experiment('.deleteRemovedDocuments', () => {
    beforeEach(async () => {
      importConnector.deleteRemovedDocuments.resolves()
      await importService.deleteRemovedDocuments()
    })

    test('calls through to the connector', async () => {
      expect(importConnector.deleteRemovedDocuments.called).to.equal(true)
    })
  })
})
