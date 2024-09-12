'use strict'

const controller = require('./controllers.js')

const routes = [
  {
    method: 'post',
    handler: controller.companiesImport,
    path: '/companies-import'
  }
]

module.exports = routes
