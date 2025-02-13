'use strict'

const cron = require('node-cron')

const config = require('../../../config')

async function register (_server, _options) {

}

module.exports = {
  plugin: {
    name: 'importJob',
    dependencies: ['pgBoss'],
    register
  }
}
