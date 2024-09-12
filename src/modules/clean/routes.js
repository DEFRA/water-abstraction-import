'use strict'

const controllers = require('./controllers.js')

const routes = [
  {
    method: 'post',
    handler: controllers.clean,
    path: '/clean'
  }
]

module.exports = routes
