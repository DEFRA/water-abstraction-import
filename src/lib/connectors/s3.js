'use strict'

const aws = require('aws-sdk')
const proxyAgent = require('proxy-agent')

const config = require('../../../config.js')

const _getS3Options = () => {
  const { bucket, ...credentials } = config.s3
  const { proxy } = config
  return {
    ...credentials,
    ...proxy && {
      httpOptions: {
        agent: proxyAgent(proxy)
      }
    }
  }
}

const getS3 = () => new aws.S3(_getS3Options())

module.exports = {
  _getS3Options,
  getS3
}
