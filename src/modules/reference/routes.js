'use strict'

const controllers = require('./controllers')

const routes = [
  {
    method: 'post',
    handler: controllers.reference,
    path: '/reference'
  }
]

module.exports = routes
