'use strict'

const controller = require('./controller')

module.exports = [
  {
    method: 'post',
    handler: controller.postImportChargeVersions,
    path: '/import/charge-versions'
  },
  {
    method: 'post',
    handler: controller.postImportChargingData,
    path: '/import/charging-data'
  }
]
