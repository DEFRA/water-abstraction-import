'use strict'

const { afterEach, beforeEach, experiment, test } = exports.lab = require('@hapi/lab').script()
const { expect } = require('@hapi/code')

const sandbox = require('sinon').createSandbox()
const moment = require('moment')
moment.locale('en-gb')

const s3 = require('../../../../src/lib/services/s3')
const s3Service = require('../../../../src/modules/nald-import/services/s3-service')

experiment('modules/nald-import/services/s3', () => {
  beforeEach(async () => {
    sandbox.stub(s3, 'download')
    sandbox.stub(s3, 'getHead').resolves({
      ETag: '"test-etag-here"'
    })
  })

  afterEach(async () => {
    sandbox.restore()
  })

  experiment('.getEtag', () => {
    let result
    beforeEach(async () => {
      result = await s3Service.getEtag()
    })

    test('the s3.getHead method is called', async () => {
      expect(s3.getHead.calledWith('wal_nald_data_release/nald_enc.zip')).to.be.true()
    })

    test('the etag is returned with quotes stripped', async () => {
      expect(result).to.equal('test-etag-here')
    })
  })

  experiment('.download', () => {
    beforeEach(async () => {
      await s3Service.download()
    })

    test('the s3.download method is called', async () => {
      expect(s3.download.calledWith(
        'wal_nald_data_release/nald_enc.zip', 'temp/nald_enc.zip'
      )).to.be.true()
    })
  })
})
