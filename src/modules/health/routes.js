'use strict'

const controller = require('./controller')

const routes = [
  {
    method: 'GET',
    path: '/health/airbrake',
    handler: controller.getAirbrake
  },
  {
    method: 'GET',
    path: '/health/info',
    handler: controller.getInfo
  }
]

module.exports = routes
