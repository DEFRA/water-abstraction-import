'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Test helpers
const moment = require('moment')
moment.locale('en-gb')

// Things we need to stub
const config = require('../../../../config')
const processHelper = require('@envage/water-abstraction-helpers').process

// Thing under test
const zipService = require('../../../../src/modules/nald-import/services/zip-service')

experiment('modules/nald-import/services/zip-service', () => {
  beforeEach(async () => {
    Sinon.stub(config.import.nald, 'zipPassword').value('test-password')
    Sinon.stub(processHelper, 'execCommand')
  })

  afterEach(async () => {
    Sinon.restore()
  })

  experiment('.extract', () => {
    experiment('when the zip commands succeed', () => {
      beforeEach(async () => {
        await zipService.extract()
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

      test('an error is thrown', async () => {
        const func = () => zipService.extract()
        const result = await expect(func()).to.reject()

        expect(result).to.equal(err)
      })
    })
  })
})
