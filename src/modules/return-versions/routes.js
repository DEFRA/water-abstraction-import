'use strict'

const controller = require('./controller')

const routes = [
  {
    method: 'post',
    handler: controller.importReturnVersions,
    path: '/import/return-versions'
  }
]

module.exports = routes
