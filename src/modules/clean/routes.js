'use strict'

const controller = require('./controllers.js')

const routes = [
  {
    method: 'post',
    handler: controller.clean,
    path: '/clean'
  }
]

module.exports = routes
