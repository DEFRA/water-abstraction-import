'use strict'

const controller = require('./controller')

const routes = [
  {
    method: 'GET',
    path: '/health/info',
    handler: controller.getInfo,
    config: {
      auth: false
    }
  }
]

module.exports = routes
