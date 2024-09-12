'use strict'

const controllers = require('./controllers.js')

const routes = [
  {
    method: 'post',
    handler: controllers.permitImport,
    path: '/permit-import'
  }
]

module.exports = routes
