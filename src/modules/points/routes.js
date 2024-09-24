'use strict'

const controller = require('./controller')

const routes = [
  {
    method: 'post',
    handler: controller.points,
    path: '/import/points'
  }
]

module.exports = routes
