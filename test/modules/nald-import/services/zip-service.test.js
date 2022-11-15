'use strict'

const { afterEach, beforeEach, experiment, test } = exports.lab = require('@hapi/lab').script()
const { expect } = require('@hapi/code')
const sandbox = require('sinon').createSandbox()
const moment = require('moment')
moment.locale('en-gb')

const { logger } = require('../../../../src/logger')
const processHelper = require('@envage/water-abstraction-helpers').process
const config = require('../../../../config')

const zipService = require('../../../../src/modules/nald-import/services/zip-service')

experiment('modules/nald-import/services/zip-service', () => {
  beforeEach(async () => {
    sandbox.stub(processHelper, 'execCommand')
    sandbox.stub(logger, 'info')
    sandbox.stub(logger, 'error')

    sandbox.stub(config.import.nald, 'zipPassword').value('test-password')
  })

  afterEach(async () => {
    sandbox.restore()
  })

  experiment('.extract', () => {
    experiment('when the zip commands succeed', () => {
      beforeEach(async () => {
        await zipService.extract()
      })

      test('logs an info message', async () => {
        expect(logger.info.calledWith('Extracting data from NALD zip file')).to.be.true()
      })

      test('the first call extracts the primary zip with password', async () => {
        const [cmd] = processHelper.execCommand.firstCall.args
        expect(cmd).to.equal('7z x temp/nald_enc.zip -o./temp/ -ptest-password')
      })

      test('the second call extracts the secondary zip without password', async () => {
        const [cmd] = processHelper.execCommand.secondCall.args
        expect(cmd).to.equal('7z x temp/NALD.zip -o./temp/')
      })
    })

    experiment('when the zip commands fail', () => {
      const err = new Error('oops')

      beforeEach(async () => {
        processHelper.execCommand.rejects(err)
      })

      test('an error is logged and rethrown', async () => {
        const func = () => zipService.extract()
        const result = await expect(func()).to.reject()
        expect(logger.error.calledWith('Could not extract NALD zip', err.stack)).to.be.true()
        expect(result).to.equal(err)
      })
    })
  })
})
