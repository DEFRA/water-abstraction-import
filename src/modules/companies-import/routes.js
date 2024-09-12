'use strict'

const controllers = require('./controllers.js')

const routes = [
  {
    method: 'post',
    handler: controllers.companiesImport,
    path: '/companies-import'
  }
]

module.exports = routes
