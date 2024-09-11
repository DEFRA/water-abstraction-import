'use strict'

const controller = require('./controllers.js')

const routes = [
  {
    method: 'post',
    handler: controller.permitImport,
    path: '/permit-import'
  }
]

module.exports = routes
