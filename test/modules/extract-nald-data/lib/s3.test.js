'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Things we need to stub
const s3Service = require('../../../../src/lib/services/s3.js')

// Thing under test
const s3 = require('../../../../src/modules/extract-nald-data/lib/s3.js')

experiment('modules/extract-nald-data/lib/s3.js', () => {
  let s3ServiceStub

  beforeEach(async () => {
    s3ServiceStub = Sinon.stub(s3Service, 'download').resolves()
  })

  afterEach(async () => {
    Sinon.restore()
  })

  experiment('.download', () => {
    test('the s3.download method is called', async () => {
      await s3.download()

      const args = s3ServiceStub.firstCall.args

      expect(args).to.equal(['wal_nald_data_release/nald_enc.zip', './temp/nald_enc.zip'])
    })
  })
})
