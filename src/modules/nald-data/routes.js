'use strict'

const controllers = require('./controllers.js')

const routes = [
  {
    method: 'post',
    handler: controllers.naldData,
    path: '/nald-data'
  }
]

module.exports = routes
