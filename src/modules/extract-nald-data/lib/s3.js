'use strict'

const path = require('path')

const s3 = require('../../../lib/services/s3.js')

const config = require('../../../../config.js')

/**
 * Downloads latest ZIP file from S3 bucket
 * @return {Promise} resolves when download complete
 */
const download = async () => {
  const s3Path = path.join(config.import.nald.path, 'nald_enc.zip')

  await s3.download(s3Path, './temp/nald_enc.zip')
}

module.exports = {
  download
}
