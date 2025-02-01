'use strict'

const controller = require('./controller')

const routes = [
  {
    method: 'post',
    handler: controller.importReturnLogs,
    path: '/import/return-logs'
  },
  {
    method: 'post',
    handler: controller.replicateReturnLogs,
    path: '/replicate/return-logs'
  },
  {
    method: 'get',
    handler: controller.returnFormats,
    path: '/import/1.0/nald/returns/formats'
  },
  {
      method: 'get',
      handler: controller.returnLogs,
      path: '/import/1.0/nald/returns/logs'
    },
    {
      method: 'get',
      handler: controller.returnLogLines,
      path: '/import/1.0/nald/returns/lines'
    },
  {
    method: 'get',
    handler: controller.returns,
    path: '/import/1.0/nald/returns'
  },
]

module.exports = routes
