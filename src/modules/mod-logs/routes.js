'use strict'

const controller = require('./controller')

const routes = [
  {
    method: 'post',
    handler: controller.importModLogs,
    path: '/import/mod-logs'
  }
]

module.exports = routes
