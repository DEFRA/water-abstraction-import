'use strict'

const { APIClient } = require('@envage/hapi-pg-rest-api')

const rp = require('request-promise-native').defaults({
  proxy: null,
  strictSSL: false
})

const events = new APIClient(rp, {
  endpoint: `${process.env.WATER_URI}/event`,
  headers: {
    Authorization: process.env.JWT_TOKEN
  }
})

module.exports = {
  events
}
