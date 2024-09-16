'use strict'

const controllers = require('./controllers')

const routes = [
  {
    method: 'post',
    handler: controllers.licenceDetails,
    path: '/licence-details'
  }
]

module.exports = routes
