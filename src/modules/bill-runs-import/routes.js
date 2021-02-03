'use strict';

const controller = require('./controller');

module.exports = [
  {
    method: 'post',
    handler: controller.postImportBillRuns,
    path: '/import/1.0/bill-runs'
  }
];
