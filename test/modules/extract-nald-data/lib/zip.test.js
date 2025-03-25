'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Things we need to stub
const config = require('../../../../config.js')
const processHelper = require('@envage/water-abstraction-helpers').process

// Thing under test
const Zip = require('../../../../src/modules/extract-nald-data/lib/zip.js')

experiment('modules/extract-nald-data/lib/zip.js', () => {
  beforeEach(async () => {
    Sinon.stub(config.import.nald, 'zipPassword').value('test-password')
    Sinon.stub(processHelper, 'execCommand')
  })

  afterEach(async () => {
    Sinon.restore()
  })

  experiment('.extract', () => {
    experiment('when the zip commands succeed', () => {
      test('the first call extracts the primary zip with password', async () => {
        await Zip.extract()

        const [cmd] = processHelper.execCommand.firstCall.args

        expect(cmd).to.equal('7z x ./temp/nald_enc.zip -o./temp/ -ptest-password')
      })

      test('the second call extracts the secondary zip without password', async () => {
        await Zip.extract()

        const [cmd] = processHelper.execCommand.secondCall.args
        expect(cmd).to.equal('7z x ./temp/NALD.zip -o./temp/')
      })
    })

    experiment('when the zip commands fail', () => {
      const err = new Error('oops')

      beforeEach(async () => {
        processHelper.execCommand.rejects(err)
      })

      test('an error is thrown', async () => {
        const func = () => Zip.extract()
        const result = await expect(func()).to.reject()

        expect(result).to.equal(err)
      })
    })
  })
})
