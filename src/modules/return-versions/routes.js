'use strict'

const controllers = require('./controllers')

const routes = [
  {
    method: 'post',
    handler: controllers.returnVersions,
    path: '/return-versions'
  }
]

module.exports = routes
