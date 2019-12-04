const controller = require('./controller');

module.exports = [
  {
    method: 'post',
    handler: controller.postImport,
    path: '/import/licences'
  }
];
