'use strict'

const controllers = require('./controllers.js')

const routes = [
  {
    method: 'post',
    handler: controllers.permit,
    path: '/permit'
  }
]

module.exports = routes
