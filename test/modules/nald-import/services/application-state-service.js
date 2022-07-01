'use strict'

const { afterEach, beforeEach, experiment, test } = exports.lab = require('@hapi/lab').script()
const { expect } = require('@hapi/code')
const sandbox = require('sinon').createSandbox()
const moment = require('moment')
moment.locale('en-gb')

const applicationStateConnector = require('../../../../src/lib/connectors/water/application-state')
const applicationStateService = require('../../../../src/lib/services/application-state-service')

experiment('modules/nald-import/services/application-state-service', () => {
  beforeEach(async () => {
    sandbox.stub(applicationStateConnector, 'getState').resolves({
      data: {
        etag: 'test-etag'
      }
    })
    sandbox.stub(applicationStateConnector, 'postState')
  })

  afterEach(async () => {
    sandbox.restore()
  })

  experiment('.get', () => {
    let result

    beforeEach(async () => {
      result = await applicationStateService.get('nald-import')
    })

    test('the application state connector is called with the correct key', async () => {
      expect(applicationStateConnector.getState.calledWith('nald-import')).to.be.true()
    })

    test('resolves with the data', async () => {
      expect(result).to.equal({ etag: 'test-etag' })
    })
  })

  experiment('.save', () => {
    beforeEach(async () => {
      await applicationStateService.save('a-new-etag', { isDownloaded: true })
    })

    test('isDownloaded is set to the value provided', async () => {
      const [, data] = applicationStateConnector.postState.lastCall.args
      expect(data.isDownloaded).to.be.true()
    })
  })
})
