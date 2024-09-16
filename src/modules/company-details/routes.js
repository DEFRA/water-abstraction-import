'use strict'

const controllers = require('./controllers.js')

const routes = [
  {
    method: 'post',
    handler: controllers.companyDetails,
    path: '/company-details'
  }
]

module.exports = routes
