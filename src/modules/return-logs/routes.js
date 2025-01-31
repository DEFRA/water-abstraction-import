'use strict'

const controller = require('./controller')

const routes = [
  {
    method: 'post',
    handler: controller.importReturnLogs,
    path: '/import/return-logs'
  }
]

module.exports = routes
