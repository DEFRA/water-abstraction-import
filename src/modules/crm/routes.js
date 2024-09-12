'use strict'

const controllers = require('./controllers.js')

const routes = [
  {
    method: 'post',
    handler: controllers.crm,
    path: '/crm'
  }
]

module.exports = routes
