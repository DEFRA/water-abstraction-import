'use strict'

require('dotenv').config()

const Hapi = require('@hapi/hapi')

const config = require('./config')

const server = Hapi.server({
  ...config.server
})

module.exports = server
