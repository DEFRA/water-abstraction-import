'use strict'

const controller = require('./controllers.js')

const routes = [
  {
    method: 'post',
    handler: controller.waterImport,
    path: '/water-import'
  }
]

module.exports = routes
