'use strict'

const controller = require('./controller')

const routes = [
  {
    method: 'post',
    handler: controller.importJob,
    path: '/import-job'
  }
]

module.exports = routes
