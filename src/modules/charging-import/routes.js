const controller = require('./controller');

module.exports = [
  {
    method: 'post',
    handler: controller.postImportChargingData,
    path: '/import/charging'
  }
];
