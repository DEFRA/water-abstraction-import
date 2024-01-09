'use strict'

const controller = require('./controller')

module.exports = [
  {
    method: 'post',
    handler: controller.postImportChargeVersions,
    path: '/import/1.0/charging'
  },
  {
    method: 'post',
    handler: controller.postImportChargingData,
    path: '/import/1.0/charging-data'
  }
]
