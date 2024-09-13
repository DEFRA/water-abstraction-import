'use strict'

const controller = require('./controller')

module.exports = [
  {
    method: 'post',
    handler: controller.postImportChargeVersions,
    path: '/import/charge-versions'
  }
]
