'use strict'

const controllers = require('./controllers.js')

const routes = [
  {
    method: 'post',
    handler: controllers.nightlyImport,
    path: '/nightly-import'
  }
]

module.exports = routes
