'use strict'

require('dotenv').config()

const Hapi = require('@hapi/hapi')
const CatboxRedis = require('@hapi/catbox-redis')

const config = require('./config')

const server = Hapi.server({
  ...config.server,
  cache: [
    {
      provider: {
        constructor: CatboxRedis,
        options: config.redis
      }
    }
  ]
})

module.exports = server
