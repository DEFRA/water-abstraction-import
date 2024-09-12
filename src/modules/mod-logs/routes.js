'use strict'

const controllers = require('./controllers')

const routes = [
  {
    method: 'post',
    handler: controllers.modLogs,
    path: '/mod-logs'
  }
]

module.exports = routes
