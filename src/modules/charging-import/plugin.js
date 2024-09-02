'use strict'

const chargeVersionsJob = require('./jobs/charge-versions')
const chargingDataJob = require('./jobs/charging-data')

const registerSubscribers = async server => {
  // Register handlers
  await server.messageQueue.subscribe(chargeVersionsJob.jobName, chargeVersionsJob.handler)
  await server.messageQueue.subscribe(chargingDataJob.jobName, chargingDataJob.handler)
}

const plugin = {
  name: 'importChargingData',
  dependencies: ['pgBoss'],
  register: server => registerSubscribers(server)
}

module.exports = {
  plugin
}
