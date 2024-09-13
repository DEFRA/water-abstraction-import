'use strict'

const controllers = require('./controllers')

const routes = [
  {
    method: 'post',
    handler: controllers.chargeVersions,
    path: '/charge-versions'
  }
]

module.exports = routes
