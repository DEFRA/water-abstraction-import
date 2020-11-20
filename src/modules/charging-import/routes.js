'use strict';

const controller = require('./controller');

module.exports = [
  {
    method: 'post',
    handler: controller.postImportChargingData,
    path: '/import/1.0/charging'
  },
  {
    method: 'post',
    handler: controller.postImportChargeVersionMetadata,
    path: '/import/1.0/charge-version-metadata'
  }
];
