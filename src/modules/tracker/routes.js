'use strict'

const controllers = require('./controllers')

const routes = [
  {
    method: 'post',
    handler: controllers.tracker,
    path: '/tracker'
  }
]

module.exports = routes
