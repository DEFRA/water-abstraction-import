'use strict'

const controller = require('./controllers.js')

const routes = [
  {
    method: 'post',
    handler: controller.nightlyImport,
    path: '/nightly-import'
  }
]

module.exports = routes
