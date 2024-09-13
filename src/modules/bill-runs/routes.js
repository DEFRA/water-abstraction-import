'use strict'

const controller = require('./controller')

const routes = [
  {
    method: 'post',
    handler: controller.billRuns,
    path: '/bill-runs'
  }
]

module.exports = routes
