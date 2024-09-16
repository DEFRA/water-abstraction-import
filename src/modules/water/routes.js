'use strict'

const controllers = require('./controllers')

const routes = [
  {
    method: 'post',
    handler: controllers.water,
    path: '/water'
  }
]

module.exports = routes
