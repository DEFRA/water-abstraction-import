'use strict'

const controller = require('./controllers.js')

const routes = [
  {
    method: 'post',
    handler: controller.naldData,
    path: '/nald-data'
  }
]

module.exports = routes
