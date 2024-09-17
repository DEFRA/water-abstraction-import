'use strict'

const controller = require('./controller')

const status = {
  method: 'GET',
  handler: controller.getStatus,
  path: '/status'
}

const testing = {
  method: 'GET',
  handler: controller.getStatus,
  path: '/etl/testing'
}

module.exports = [status, testing]
