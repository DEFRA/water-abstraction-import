'use strict'

const controller = require('./controller')

const status = {
  method: 'GET',
  handler: controller.getStatus,
  options: {
    auth: false,
    description: 'Checks if the service is alive'
  },
  path: '/status'
}

const testing = {
  method: 'GET',
  handler: controller.getStatus,
  options: {
    auth: false,
    description: 'For testing etl path mapping'
  },
  path: '/etl/testing'
}

module.exports = [status, testing]
