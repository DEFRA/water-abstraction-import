const controller = require('./controller');

module.exports = [
  {
    method: 'post',
    handler: controller.postImportCRMData,
    path: '/import/crm'
  }
];
